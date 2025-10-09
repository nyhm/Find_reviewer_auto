const express = require('express');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// 静的ファイルの提供
app.use(express.static('public'));
app.use(express.json());

// キャッシュ用変数
let cachedUsersWithProjects = []; // { login: string, projects: array }
let cacheLastUpdated = null;
let cacheCreated = false; // キャッシュが一度でも作成されたかどうか
const CACHE_DURATION = 10 * 60 * 1000; //10分

// キャッシュ作成中のロック機構
let isCacheUpdating = false;
let cacheUpdatePromise = null;
let cacheProgress = { phase: '', current: 0, total: 0, message: '' };

// トークン取得関数（リトライロジック付き）
async function getAccessToken(retryCount = 0) {
  try {
    // デバッグ：環境変数の読み込み確認
    const uid = process.env.U_ID;
    const secret = process.env.SECRET;
    
    if (retryCount === 0) {
      console.log('🔐 環境変数チェック:');
      console.log(`   U_ID: ${uid ? uid.substring(0, 15) + '...' : '❌ 未設定'}`);
      console.log(`   SECRET: ${secret ? secret.substring(0, 15) + '...' : '❌ 未設定'}`);
      console.log(`   U_ID長さ: ${uid ? uid.length : 0}文字`);
      console.log(`   SECRET長さ: ${secret ? secret.length : 0}文字`);
    }
    
    if (!uid || !secret) {
      throw new Error('環境変数U_IDまたはSECRETが設定されていません');
    }
    
    const response = await axios.post('https://api.intra.42.fr/oauth/token', 
      `grant_type=client_credentials&client_id=${uid}&client_secret=${secret}`,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        timeout: 10000
      }
    );
    
    console.log('✅ トークン取得成功\n');
    return response.data.access_token;
  } catch (error) {
    console.error(`❌ トークン取得エラー (試行${retryCount + 1}/3):`, error.message);
    
    // Cloudflareチャレンジの検出
    if (error.response && error.response.data && 
        typeof error.response.data === 'string' && 
        error.response.data.includes('Just a moment')) {
      console.error('   ⚠️  Cloudflareチャレンジが検出されました');
    }
    
    // リトライロジック（最大3回）
    if (retryCount < 2 && error.response && error.response.status === 403) {
      const waitTime = (retryCount + 1) * 2000; // 2秒、4秒
      console.log(`   ⏳ ${waitTime/1000}秒後に再試行します...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return getAccessToken(retryCount + 1);
    }
    
    if (error.response) {
      console.error('   ステータス:', error.response.status);
    }
    throw error;
  }
}

// 現在校舎にいるユーザーを取得
async function getActiveUsers(token) {
  const users = [];
  try {
    console.log('📡 校舎内のユーザー情報を取得中...');
    
    // 進捗表示の初期化
    cacheProgress.phase = 'pages';
    cacheProgress.total = 1;
    cacheProgress.current = 0;
    cacheProgress.message = '42Tokyo校舎の席情報を取得中...';
    
    // locationsエンドポイントから現在ログイン中の人のみを取得
    const response = await axios.get(
      `https://api.intra.42.fr/v2/campus/26/locations`,
      {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        },
        timeout: 30000  // 30秒に延長
      }
    );
    
    // user != null かつ end_at がない（現在ログイン中）の人のみ
    const activeLogins = response.data
      .filter(location => location.user !== null && !location.end_at)
      .map(location => location.user.login);
    
    // 重複を削除
    const uniqueUsers = [...new Set(activeLogins)];
    users.push(...uniqueUsers);
    
    cacheProgress.current = 1;
    console.log(`✅ 合計 ${users.length}人のアクティブユーザーを取得（現在ログイン中）`);
  } catch (error) {
    console.error('ユーザー取得エラー:', error.message);
  }
  return users;
}

// キャッシュを更新（ユーザーとプロジェクト情報を含む）
// ロック機構付き：同時に1つのキャッシュ作成のみ実行
async function updateCache() {
  // 既にキャッシュ作成中の場合は、そのPromiseを返す（待機）
  if (isCacheUpdating && cacheUpdatePromise) {
    console.log('⏳ キャッシュ作成中です。完了を待っています...');
    return cacheUpdatePromise;
  }
  
  // キャッシュ作成開始
  isCacheUpdating = true;
  
  cacheUpdatePromise = (async () => {
    try {
      console.log('\n🔄 キャッシュを更新中...');
      const token = await getAccessToken();
      const activeUserLogins = await getActiveUsers(token);
      
      // 0人でもキャッシュ作成は継続（空のキャッシュとして保存）
      if (activeUserLogins.length === 0) {
        console.warn('⚠️  現在アクティブユーザーが0人です');
        cachedUsersWithProjects = [];
        cacheLastUpdated = new Date();
        cacheCreated = true;
        console.log(`\n✅ キャッシュ更新完了 (0人)`);
        console.log(`⏰ 更新時刻: ${cacheLastUpdated.toLocaleString('ja-JP')}\n`);
        return true; // 成功として返す
      }
      
      console.log(`\n📋 各ユーザーのプロジェクト情報を取得中...`);
      
      // 新しいキャッシュを一時変数に構築（古いキャッシュは保持）
      const newCache = [];
      
      // フェーズをユーザー情報取得に切り替え
      cacheProgress.phase = 'users';
      cacheProgress.total = activeUserLogins.length;
      cacheProgress.current = 0;
      
      for (let i = 0; i < activeUserLogins.length; i++) {
        const login = activeUserLogins[i];
        cacheProgress.current = i + 1;
        cacheProgress.message = `${login}のプロジェクト情報を取得中...`;
        console.log(`  [${i + 1}/${activeUserLogins.length}] ${login}`);
        
        const projects = await getUserProjects(token, login);
        const userDetails = await getUserDetails(token, login);
        
        // locationsエンドポイントで取得した人は確実に42Tokyoにいるのでそのまま追加
        newCache.push({
          login: login,
          projects: projects,
          image: userDetails.image,
          location: userDetails.location,
          displayName: userDetails.displayname || userDetails.usual_full_name || login
        });
        
        // レート制限対策
        await new Promise(resolve => setTimeout(resolve, 700));
      }
      
      // 進捗をリセット
      cacheProgress.phase = '';
      cacheProgress.current = 0;
      cacheProgress.total = 0;
      cacheProgress.message = '';
      
      // 新しいキャッシュが完成したら入れ替え（これで検索が途切れない）
      cachedUsersWithProjects = newCache;
      cacheLastUpdated = new Date();
      cacheCreated = true; // キャッシュ作成完了フラグ
      console.log(`\n✅ キャッシュ更新完了 (${cachedUsersWithProjects.length}人)`);
      console.log(`⏰ 更新時刻: ${cacheLastUpdated.toLocaleString('ja-JP')}\n`);
      return true;
    } catch (error) {
      console.error('❌ キャッシュ更新エラー:', error.message);
      
      // エラーでも、一度キャッシュを作成したことがあれば継続
      if (!cacheCreated) {
        console.error('💡 初回キャッシュ作成に失敗しました');
        console.error('💡 手動で「🔄 更新」ボタンをクリックしてみてください\n');
      }
      
      return false;
    } finally {
      // ロックを解放
      isCacheUpdating = false;
      cacheUpdatePromise = null;
    }
  })();
  
  return cacheUpdatePromise;
}

// キャッシュが有効かチェック
function isCacheValid() {
  // キャッシュが一度も作成されていない場合は無効
  if (!cacheCreated || !cacheLastUpdated) {
    return false;
  }
  
  // 0人でもキャッシュが作成されていれば、期限内は有効
  const now = new Date();
  return (now - cacheLastUpdated) < CACHE_DURATION;
}

// ユーザーのプロジェクト情報を取得（429エラー時リトライ付き）
async function getUserProjects(token, login, retryCount = 0) {
  try {
    const response = await axios.get(
      `https://api.intra.42.fr/v2/users/${login}/projects_users?per_page=100`,
      {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        },
        timeout: 15000
      }
    );
    return response.data;
  } catch (error) {
    // 429エラー時はリトライ
    if (error.response?.status === 429 && retryCount < 3) {
      const waitTime = (retryCount + 1) * 3000; // 3秒、6秒、9秒
      console.log(`  ⏳ ${login}: 429エラー - ${waitTime/1000}秒待機してリトライ...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return getUserProjects(token, login, retryCount + 1);
    }
    
    console.error(`${login}のプロジェクト取得エラー:`, error.message);
    return [];
  }
}

// ユーザーの詳細情報を取得（429エラー時リトライ付き）
async function getUserDetails(token, login, retryCount = 0) {
  try {
    const response = await axios.get(
      `https://api.intra.42.fr/v2/users/${login}`,
      {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        },
        timeout: 15000
      }
    );
    
    // 42Tokyoキャンパスの情報を取得
    const tokyoCampus = response.data.campus_users?.find(cu => cu.campus_id === 26);
    
    return {
      image: response.data.image?.versions?.medium || response.data.image?.link,
      location: response.data.location,
      displayname: response.data.displayname,
      usual_full_name: response.data.usual_full_name,
      pool_month: response.data.pool_month,
      pool_year: response.data.pool_year,
      campus_id: tokyoCampus ? 26 : null
    };
  } catch (error) {
    // 429エラー時はリトライ
    if (error.response?.status === 429 && retryCount < 3) {
      const waitTime = (retryCount + 1) * 3000; // 3秒、6秒、9秒
      console.log(`  ⏳ ${login}: 429エラー - ${waitTime/1000}秒待機してリトライ...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return getUserDetails(token, login, retryCount + 1);
    }
    
    console.error(`${login}の詳細取得エラー:`, error.message);
    return { image: null, location: null, displayname: login, campus_id: null };
  }
}

// API: よく使われる課題リストを取得
app.get('/api/projects', async (req, res) => {
  try {
    // 42Tokyoでよく使われる課題リスト
    const commonProjects = [
      'Exam Rank 02',
      'Exam Rank 03',
      'Exam Rank 04',
      'Exam Rank 05',
      'Exam Rank 06',
      'get_next_line',
      'ft_printf',
      'Born2beroot',
      'so_long',
      'FdF',
      'fract-ol',
      'ft_minitalk',
      'push_swap',
      'pipex',
      'minishell',
      'Philosophers',
      'CPP Module 00',
      'CPP Module 01',
      'CPP Module 02',
      'CPP Module 03',
      'CPP Module 04',
      'CPP Module 05',
      'CPP Module 06',
      'CPP Module 07',
      'CPP Module 08',
      'CPP Module 09',
      'NetPractice',
      'cub3d',
      'Inception',
      'miniRT',
      'ft_irc',
      'webserv',
      'ft_transcendence'
    ];
    
    res.json({ projects: commonProjects });
  } catch (error) {
    res.status(500).json({ error: 'プロジェクト一覧の取得に失敗しました' });
  }
});

// API: キャッシュ情報を取得
app.get('/api/cache/status', (req, res) => {
  const totalProjects = cachedUsersWithProjects.reduce((sum, user) => sum + user.projects.length, 0);
  const statusMessage = isCacheUpdating ? 
    '新しいキャッシュ作成中（古いキャッシュで検索可能）' : 
    null;
  
  res.json({
    userCount: cachedUsersWithProjects.length,
    totalProjects: totalProjects,
    lastUpdated: cacheLastUpdated,
    isValid: isCacheValid(),
    expiresIn: cacheLastUpdated ? CACHE_DURATION - (new Date() - cacheLastUpdated) : 0,
    isUpdating: isCacheUpdating,  // キャッシュ作成中かどうか
    progress: isCacheUpdating ? cacheProgress : null,  // 進捗情報
    statusMessage: statusMessage,  // 状態メッセージ
    cacheCreated: cacheCreated  // キャッシュが一度でも作成されたか
  });
});

// API: キャッシュ作成の進捗をSSEで配信
app.get('/api/cache/progress', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  const sendProgress = () => {
    if (isCacheUpdating) {
      res.write(`data: ${JSON.stringify(cacheProgress)}\n\n`);
    } else {
      res.write(`data: ${JSON.stringify({ current: 0, total: 0, message: 'completed' })}\n\n`);
    }
  };
  
  // 1秒ごとに進捗を送信
  const interval = setInterval(sendProgress, 1000);
  sendProgress(); // 初回送信
  
  req.on('close', () => {
    clearInterval(interval);
    res.end();
  });
});

// API: キャッシュを手動更新
app.post('/api/cache/refresh', async (req, res) => {
  try {
    const success = await updateCache();
    if (success) {
      const totalProjects = cachedUsersWithProjects.reduce((sum, user) => sum + user.projects.length, 0);
      res.json({
        success: true,
        userCount: cachedUsersWithProjects.length,
        totalProjects: totalProjects,
        lastUpdated: cacheLastUpdated
      });
    } else {
      res.status(500).json({ error: 'キャッシュの更新に失敗しました' });
    }
  } catch (error) {
    res.status(500).json({ error: 'キャッシュの更新に失敗しました' });
  }
});

// API: 指定した課題を完了している現在校舎にいる人を取得
app.get('/api/reviewers/:projectName', async (req, res) => {
  try {
    const projectName = decodeURIComponent(req.params.projectName);
    console.log(`\n🔍 検索開始: ${projectName}`);
    
    // キャッシュが無効な場合のみ更新（0人でもキャッシュ作成済みなら更新しない）
    if (!isCacheValid()) {
      console.log('⚠️  キャッシュが無効または未作成です。更新します...');
      await updateCache();
    } else {
      if (cachedUsersWithProjects.length === 0) {
        console.log(`ℹ️  キャッシュは有効です（現在アクティブユーザーが0人）`);
      } else {
        console.log(`✅ キャッシュを使用 (${cachedUsersWithProjects.length}人)`);
      }
    }
    
    const startTime = Date.now();
    const reviewers = [];
    
    // 検索対象の課題がEXAMかどうかを判定
    const isExamProject = projectName === 'Exam Rank 02' || 
                         projectName === 'Exam Rank 03' ||
                         projectName === 'Exam Rank 04' ||
                         projectName === 'Exam Rank 05' ||
                         projectName === 'Exam Rank 06';
    
    // キャッシュから直接検索（APIリクエスト不要！）
    for (const user of cachedUsersWithProjects) {
      let completedProject;
      
      if (isExamProject) {
        // EXAMの場合：finishedかつ100点以上
        completedProject = user.projects.find(
          p => p.project.name === projectName && 
               p.status === "finished" &&
               p.final_mark >= 100
        );
      } else {
        // 通常の課題：finishedのみ（点数関係なし）
        completedProject = user.projects.find(
          p => p.project.name === projectName && 
               p.status === "finished"
        );
      }
      
      if (completedProject) {
        reviewers.push({
          login: user.login,
          finalMark: completedProject.final_mark,
          validated: completedProject['validated?'],
          status: completedProject.status,
          image: user.image,
          location: user.location,
          displayName: user.displayName
        });
        console.log(`  ✅ ${user.login} - ${completedProject.final_mark}点 (${completedProject.status})`);
      }
    }
    
    const duration = Date.now() - startTime;
    console.log(`\n⚡️ 完了: ${reviewers.length}人が見つかりました (${duration}ms)`);
    
    res.json({
      project: projectName,
      count: reviewers.length,
      reviewers: reviewers.sort((a, b) => b.finalMark - a.finalMark),
      searchDuration: duration,
      cacheInfo: {
        userCount: cachedUsersWithProjects.length,
        lastUpdated: cacheLastUpdated
      }
    });
    
  } catch (error) {
    console.error('❌ エラー:', error.message);
    res.status(500).json({ error: 'レビュワーの取得に失敗しました' });
  }
});

// サーバー起動
const HOST = process.env.HOST || '0.0.0.0';
app.listen(PORT, HOST, async () => {
  console.log(`\n🚀 サーバーが起動しました: http://${HOST}:${PORT}`);
  console.log(`📍 42Tokyo レビュワー検索システム\n`);
  
  // 初回キャッシュ作成（失敗してもサーバーは起動）
  const success = await updateCache();
  
  if (!success && !cacheCreated) {
    console.log('⚠️  初回キャッシュ作成に失敗しましたが、サーバーは起動しています');
    console.log('💡 ブラウザから手動更新を試してください\n');
  } else if (cachedUsersWithProjects.length === 0 && cacheCreated) {
    console.log('ℹ️  現在アクティブなユーザーが0人です（キャッシュは正常に作成されました）\n');
  }
  
  // 定期的にキャッシュを更新（5分ごと）
  setInterval(async () => {
    console.log('\n⏰ 定期キャッシュ更新...');
    await updateCache();
  }, CACHE_DURATION);
});


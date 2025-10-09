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
const CACHE_DURATION = 5 * 60 * 1000; //5分

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
    // 最初の数ページのみ取得（処理時間短縮のため）
    for (let page = 1; page <= 10; page++) {
      const response = await axios.get(
        `https://api.intra.42.fr/v2/campus/26/users?page=${page}&per_page=100`,
        {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
          },
          timeout: 15000
        }
      );
      
      if (response.data.length === 0) break;
      
      const activeUsers = response.data
        .filter(user => user.location !== null)
        .map(user => user.login);
      
      users.push(...activeUsers);
      console.log(`   ページ ${page}: ${activeUsers.length}人`);
      
      // レート制限対策
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    console.log(`✅ 合計 ${users.length}人のアクティブユーザーを取得`);
  } catch (error) {
    console.error('ユーザー取得エラー:', error.message);
  }
  return users;
}

// キャッシュを更新（ユーザーとプロジェクト情報を含む）
async function updateCache() {
  try {
    console.log('\n🔄 キャッシュを更新中...');
    const token = await getAccessToken();
    const activeUserLogins = await getActiveUsers(token);
    
    console.log(`\n📋 各ユーザーのプロジェクト情報を取得中...`);
    const usersWithProjects = [];
    
    for (let i = 0; i < activeUserLogins.length; i++) {
      const login = activeUserLogins[i];
      console.log(`  [${i + 1}/${activeUserLogins.length}] ${login}`);
      
      const projects = await getUserProjects(token, login);
      usersWithProjects.push({
        login: login,
        projects: projects
      });
      
      // レート制限対策
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    cachedUsersWithProjects = usersWithProjects;
    cacheLastUpdated = new Date();
    console.log(`\n✅ キャッシュ更新完了 (${cachedUsersWithProjects.length}人)`);
    console.log(`⏰ 更新時刻: ${cacheLastUpdated.toLocaleString('ja-JP')}\n`);
    return true;
  } catch (error) {
    console.error('❌ キャッシュ更新エラー:', error.message);
    return false;
  }
}

// キャッシュが有効かチェック
function isCacheValid() {
  if (!cacheLastUpdated || cachedUsersWithProjects.length === 0) {
    return false;
  }
  const now = new Date();
  return (now - cacheLastUpdated) < CACHE_DURATION;
}

// ユーザーのプロジェクト情報を取得
async function getUserProjects(token, login) {
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
    console.error(`${login}のプロジェクト取得エラー:`, error.message);
    return [];
  }
}

// API: よく使われる課題リストを取得
app.get('/api/projects', async (req, res) => {
  try {
    // 42Tokyoでよく使われる課題リスト
    const commonProjects = [
      'Libft',
      'get_next_line',
      'ft_printf',
      'Born2beroot',
      'so_long',
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
      'miniRT',
      'ft_containers',
      'webserv',
      'ft_transcendence',
      'Inception'
    ];
    
    res.json({ projects: commonProjects });
  } catch (error) {
    res.status(500).json({ error: 'プロジェクト一覧の取得に失敗しました' });
  }
});

// API: キャッシュ情報を取得
app.get('/api/cache/status', (req, res) => {
  const totalProjects = cachedUsersWithProjects.reduce((sum, user) => sum + user.projects.length, 0);
  res.json({
    userCount: cachedUsersWithProjects.length,
    totalProjects: totalProjects,
    lastUpdated: cacheLastUpdated,
    isValid: isCacheValid(),
    expiresIn: cacheLastUpdated ? CACHE_DURATION - (new Date() - cacheLastUpdated) : 0
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
    
    // キャッシュが無効な場合は更新
    if (!isCacheValid()) {
      console.log('⚠️  キャッシュが無効です。更新します...');
      await updateCache();
    } else {
      console.log(`✅ キャッシュを使用 (${cachedUsersWithProjects.length}人)`);
    }
    
    const startTime = Date.now();
    const reviewers = [];
    
    // キャッシュから直接検索（APIリクエスト不要！）
    for (const user of cachedUsersWithProjects) {
      const completedProject = user.projects.find(
        p => p.project.name === projectName && 
             p.status === "finished"
      );
      
      if (completedProject) {
        reviewers.push({
          login: user.login,
          finalMark: completedProject.final_mark,
          validated: completedProject['validated?'],
          status: completedProject.status
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
app.listen(PORT, async () => {
  console.log(`\n🚀 サーバーが起動しました: http://localhost:${PORT}`);
  console.log(`📍 42Tokyo レビュワー検索システム\n`);
  
  // 初回キャッシュ作成
  await updateCache();
  
  // 定期的にキャッシュを更新（10分ごと）
  setInterval(async () => {
    console.log('\n⏰ 定期キャッシュ更新...');
    await updateCache();
  }, CACHE_DURATION);
});


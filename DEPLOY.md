# 🚀 デプロイガイド

このWebアプリケーションを一般公開する方法を説明します。

---

## 📋 目次

1. [なぜGitHub Pagesは使えないのか？](#github-pages)
2. [推奨デプロイ方法](#推奨デプロイ方法)
3. [Render.comでのデプロイ手順](#rendercom-手順)
4. [その他の選択肢](#その他の選択肢)
5. [セキュリティ注意事項](#セキュリティ)

---

## ❌ GitHub Pagesが使えない理由 {#github-pages}

### 技術的制限

1. **サーバーサイドコードが必要**
   - 現在の実装は`server.js`（Node.js + Express）で動作
   - GitHub Pagesは静的ファイル（HTML/CSS/JS）のみをホスト

2. **APIキーの秘匿性**
   - 42 API の `U_ID` と `SECRET` を秘密にする必要がある
   - クライアントサイドに露出すると誰でもあなたのAPIキーを使える

3. **キャッシュシステム**
   - サーバーメモリにキャッシュを保存
   - 静的ホスティングでは不可能

---

## ✅ 推奨デプロイ方法 {#推奨デプロイ方法}

以下のサービスがおすすめです（無料枠あり）：

| サービス | 無料枠 | 難易度 | 推奨度 |
|---------|-------|-------|--------|
| **Render.com** | ✅ あり | ⭐️ 簡単 | 🥇 最推奨 |
| **Railway.app** | ✅ あり（制限付き） | ⭐️⭐️ 普通 | 🥈 おすすめ |
| **Vercel** | ✅ あり | ⭐️⭐️ 普通 | 🥉 良い |
| **Fly.io** | ✅ あり | ⭐️⭐️⭐️ やや難 | 👍 良い |

---

## 🎯 Render.comでのデプロイ手順 {#rendercom-手順}

### Step 1: GitHubリポジトリを準備

1. GitHubに新しいリポジトリを作成
2. 現在のコードをプッシュ

```bash
cd /Users/hiroki/42API/findreviewer

# Gitリポジトリを初期化（まだの場合）
git init

# すべてのファイルを追加
git add .

# コミット
git commit -m "Initial commit: 42Tokyo Reviewer Finder"

# GitHubリポジトリと連携
git remote add origin https://github.com/YOUR_USERNAME/findreviewer.git

# プッシュ
git branch -M main
git push -u origin main
```

**重要**: `.env`ファイルは`.gitignore`に含まれているので、GitHubにはプッシュされません ✅

---

### Step 2: Render.comアカウント作成

1. [Render.com](https://render.com) にアクセス
2. 「Get Started for Free」をクリック
3. GitHubアカウントで登録

---

### Step 3: Webサービスを作成

1. ダッシュボードで「New +」→「Web Service」をクリック
2. GitHubリポジトリを接続
3. `findreviewer`リポジトリを選択

---

### Step 4: 設定

以下のように設定：

```
Name: findreviewer (任意の名前)
Region: Singapore (日本に近い)
Branch: main
Root Directory: (空欄)
Runtime: Node
Build Command: npm install
Start Command: npm start
```

**プラン**: 「Free」を選択

---

### Step 5: 環境変数を設定

「Environment」セクションで以下を追加：

```
U_ID = u-s4t2ud-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SECRET = s-s4t2ud-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
PORT = 3000
```

**重要**: あなたの実際の`U_ID`と`SECRET`を`.env`ファイルからコピーして入力してください。

---

### Step 6: デプロイ

「Create Web Service」をクリック

デプロイが完了すると、URLが発行されます：
```
https://findreviewer.onrender.com
```

このURLをブラウザで開くとアプリが動作します！

---

### 🔄 自動デプロイ

GitHubリポジトリにプッシュすると、自動的に再デプロイされます。

```bash
git add .
git commit -m "Update"
git push
```

数分後、変更が反映されます。

---

## 🛠️ その他の選択肢 {#その他の選択肢}

### 2. Railway.app

**メリット**:
- GitHubから自動デプロイ
- 環境変数管理が簡単
- UI/UXが良い

**デメリット**:
- 無料枠は月500時間（約20日）まで

**手順**:
1. [Railway.app](https://railway.app) でサインアップ
2. 「New Project」→「Deploy from GitHub repo」
3. リポジトリを選択
4. 環境変数を設定
5. デプロイ

---

### 3. Vercel

**メリット**:
- Next.jsとの相性が良い
- 高速CDN
- 自動HTTPS

**デメリット**:
- Express用の設定が必要

**手順**:
1. [Vercel](https://vercel.com) でサインアップ
2. `vercel.json`を作成（下記参照）
3. `vercel`コマンドでデプロイ

`vercel.json`:
```json
{
  "version": 2,
  "builds": [
    {
      "src": "server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "server.js"
    }
  ]
}
```

---

### 4. セルフホスティング

自分のサーバーがある場合：

```bash
# サーバーにログイン
ssh user@your-server.com

# コードをクローン
git clone https://github.com/YOUR_USERNAME/findreviewer.git
cd findreviewer

# 依存関係インストール
npm install

# .envファイルを作成
nano .env
# U_ID と SECRET を入力

# PM2で起動（自動再起動）
npm install -g pm2
pm2 start server.js --name findreviewer

# 起動時に自動起動
pm2 startup
pm2 save
```

---

## 🔒 セキュリティ注意事項 {#セキュリティ}

### ✅ やるべきこと

1. **環境変数を使う**
   - `.env`ファイルは絶対にGitHubにプッシュしない
   - デプロイサービスの環境変数機能を使う

2. **`.gitignore`を確認**
   ```
   node_modules/
   .env
   reviewer.txt
   npm-debug.log
   .DS_Store
   ```

3. **APIレート制限**
   - 現在は5分ごとの自動更新
   - 必要に応じて調整

4. **CORS設定（必要な場合）**
   特定のドメインからのみアクセスを許可：
   ```javascript
   const cors = require('cors');
   app.use(cors({
     origin: 'https://yourdomain.com'
   }));
   ```

### ❌ やってはいけないこと

1. ❌ `.env`ファイルをGitHubにプッシュ
2. ❌ APIキーをクライアントサイドのコードに書く
3. ❌ `U_ID`と`SECRET`を公開

---

## 📊 デプロイ後の確認事項

デプロイが完了したら、以下を確認：

1. ✅ トップページが表示される
2. ✅ 課題リストが取得できる（`GET /api/projects`）
3. ✅ キャッシュが作成される（起動後1-2分待つ）
4. ✅ 検索が機能する
5. ✅ キャッシュ更新ボタンが動作する

---

## 🎉 完了！

デプロイが成功すると、誰でもあなたのWebアプリにアクセスできます！

URLを42Tokyoの仲間にシェアしましょう！

---

## 💡 Tips

### パフォーマンス向上

1. **キャッシュ時間を調整**
   ```javascript
   const CACHE_DURATION = 10 * 60 * 1000; // 10分に変更
   ```

2. **検索ページ数を調整**
   ```javascript
   for (let page = 1; page <= 20; page++) { // より多くのユーザーを検索
   ```

### カスタマイズ

- ヘッダーの色を変更
- 課題リストに新しい課題を追加
- キャンパスID（現在26=Tokyo）を変更可能に

---

## 🆘 トラブルシューティング

### デプロイが失敗する

- `package.json`の`"start"`スクリプトを確認
- 環境変数が正しく設定されているか確認
- ログを確認

### アプリが動かない

- サーバーログを確認
- 環境変数が正しいか確認
- ポート番号を確認（Renderは自動設定）

### キャッシュが作成されない

- APIキーが正しいか確認
- 42 APIの制限に達していないか確認
- ログでエラーを確認

---

## 📚 参考リンク

- [Render Documentation](https://render.com/docs)
- [Railway Documentation](https://docs.railway.app)
- [Vercel Documentation](https://vercel.com/docs)
- [42 API Documentation](https://api.intra.42.fr/apidoc)

---

**質問があれば、気軽に聞いてください！** 🚀


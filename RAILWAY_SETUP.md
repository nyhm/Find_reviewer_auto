# 🚂 Railway.app セットアップガイド

**Renderで403エラーが出る場合、Railway.appを試してください**

Railway.appはCloudflareとの相性が良く、42 APIへのアクセスが成功しやすいです。

---

## 🚀 Railway.app デプロイ手順

### Step 1: アカウント作成

1. [Railway.app](https://railway.app) にアクセス
2. 「**Start a New Project**」をクリック
3. 「**Login with GitHub**」でサインアップ

---

### Step 2: プロジェクトを作成

1. ダッシュボードで「**New Project**」をクリック
2. 「**Deploy from GitHub repo**」を選択
3. GitHubリポジトリを接続：
   - 「**Configure GitHub App**」をクリック
   - `Find_reviewer_auto`リポジトリを選択
   - 「**Install & Authorize**」
4. リストから `nyhm/Find_reviewer_auto` を選択

---

### Step 3: 環境変数を設定

1. プロジェクトが作成されたら、サービスをクリック
2. 「**Variables**」タブをクリック
3. 「**New Variable**」で以下を追加：

```
U_ID = u-s4t2ud-
SECRET = s-s4t2ud
PORT = 3000
```

**注意**: Railway.appでも引用符は不要です

---

### Step 4: デプロイ

1. 自動的にデプロイが開始されます
2. 「**Deployments**」タブでログを確認

**成功のログ：**
```
🚀 サーバーが起動しました
🔐 環境変数チェック:
   U_ID: u-s4t2ud-eec521...
   SECRET: s-s4t2ud-be1a15...
   U_ID長さ: 73文字
   SECRET長さ: 73文字
✅ トークン取得成功  ← ここが重要！
📡 校舎内のユーザー情報を取得中...
✅ 合計 XX人のアクティブユーザーを取得
```

---

### Step 5: ドメインを公開

1. 「**Settings**」タブをクリック
2. 「**Networking**」セクション
3. 「**Generate Domain**」をクリック

URLが発行されます：
```
https://find-reviewer-auto-production.up.railway.app
```

---

## 💰 料金

- **無料枠**: 月$5分のクレジット（約500時間）
- **最初は$5無料**で提供される
- 小規模アプリなら無料枠で十分

---

## ⚙️ 設定ファイル（オプション）

`railway.json`を作成（オプション）：

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

---

## ✅ メリット

1. ✅ Cloudflare 403エラーが出にくい
2. ✅ セットアップが簡単
3. ✅ GitHubとの連携が強力
4. ✅ ログが見やすい
5. ✅ 初回$5無料クレジット

---

## 🔄 RenderからRailwayへの移行

1. Railway.appでプロジェクトを作成（上記手順）
2. デプロイ成功を確認
3. Renderのサービスを削除（オプション）

**データは失われません**（すべてGitHubにあります）

---

## 🆘 トラブルシューティング

### デプロイが失敗する

- ログを確認
- 環境変数が正しいか確認

### アプリが動かない

- 「Variables」タブで環境変数を確認
- 「Deployments」→ 最新のデプロイのログを確認

---

**Railway.appを試してみてください！**

多くの場合、Renderでダメでも Railway.appなら成功します！ 🚂


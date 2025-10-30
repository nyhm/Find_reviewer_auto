# 🚀 Render.com セットアップガイド

## 手順1: アカウント作成

1. [Render.com](https://render.com) にアクセス
2. 右上の「Get Started for Free」をクリック
3. GitHubアカウントで登録
   - 「Sign up with GitHub」をクリック
   - GitHubでRender.comを認証

---

## 手順2: GitHubリポジトリと接続

1. Render.comのダッシュボードで「New +」ボタンをクリック
2. 「Web Service」を選択
3. 「Connect a repository」画面で：
   - 右側の「+ Connect account」をクリック（初回のみ）
   - または既に接続済みなら「Configure account」
4. GitHubでRenderにリポジトリへのアクセスを許可：
   - 「Only select repositories」を選択
   - `Find_reviewer_auto` を選択
   - 「Install & Authorize」をクリック
5. リポジトリリストから `nyhm/Find_reviewer_auto` を選択
6. 「Connect」をクリック

---

## 手順3: サービスの設定

以下のように設定してください：

### 基本設定

```
Name: findreviewer
(または任意の名前。これがURLになります)

Region: Singapore
(日本に最も近いリージョン)

Branch: main

Root Directory: (空欄のまま)

Runtime: Node

Build Command: npm install

Start Command: npm start
```

### プラン選択

```
Instance Type: Free
(無料プランで十分です)
```

---

## 手順4: 環境変数の設定

**重要**: `.env` ファイルの内容をRenderに設定します

ページ下部の「Environment」セクションで「Add Environment Variable」をクリックし、以下を追加：

### 必須の環境変数

1. **U_ID**
   ```
   Key: U_ID
   Value: u-s4t2ud-xxxxx... (あなたの42 API UID)
   ```

2. **SECRET**
   ```
   Key: SECRET
   Value: s-s4t2ud-xxxxx... (あなたの42 API Secret)
   ```

3. **PORT** (オプション)
   ```
   Key: PORT
   Value: 3000
   ```

### 環境変数の確認方法

ローカルの `.env` ファイルから値をコピー：

```bash
cat .env
```

出力例：
```
U_ID="u-s0"
SECRET="s-s4t"
```

この値をコピーしてRenderに貼り付けてください（引用符は不要）

---

## 手順5: デプロイ実行

1. すべての設定を確認
2. ページ下部の「Create Web Service」をクリック
3. デプロイが自動的に開始されます

### デプロイの進行状況

ログが表示されます：

```
==> Cloning from https://github.com/nyhm/Find_reviewer_auto...
==> Checking out commit...
==> Running build command: npm install
added 79 packages...
==> Build successful
==> Starting service with: npm start
🚀 サーバーが起動しました: http://0.0.0.0:3000
📍 42Tokyo レビュワー検索システム
🔄 キャッシュを更新中...
```

**初回は5-10分かかります**（キャッシュ作成のため）

---

## 手順6: アプリにアクセス

デプロイが完了すると、URLが表示されます：

```
https://findreviewer.onrender.com
```

または

```
https://findreviewer-xxxx.onrender.com
```

このURLをブラウザで開いてアクセスできます！

---

## ✅ 動作確認

以下を確認してください：

1. ✅ トップページが表示される
2. ✅ 課題リストが読み込まれる
3. ✅ キャッシュ情報が表示される（1-2分待つ）
4. ✅ 検索が動作する

### 確認用URL

```
https://YOUR-APP-NAME.onrender.com/api/cache/status
```

正常なレスポンス：
```json
{
  "userCount": 15,
  "totalProjects": 500,
  "lastUpdated": "2025-10-09T12:00:00.000Z",
  "isValid": true
}
```

---

## 🔄 自動デプロイ設定

GitHubにプッシュすると自動的に再デプロイされます：

```bash
git add .
git commit -m "Update"
git push origin main
```

数分後、変更が反映されます。

---

## ⚙️ カスタム設定

### カスタムドメイン

Renderの「Settings」→「Custom Domain」で設定可能

### 環境変数の追加・変更

1. Renderダッシュボードでサービスを選択
2. 左メニューの「Environment」をクリック
3. 環境変数を追加・編集
4. 「Save Changes」→ 自動的に再デプロイ

### ログの確認

左メニューの「Logs」でリアルタイムログを確認できます

---

## 🆘 トラブルシューティング

### デプロイが失敗する

**症状**: Build failedと表示される

**対処法**:
1. ログを確認
2. `package.json` の `start` スクリプトを確認
3. Node.jsバージョンを確認

### アプリが起動しない

**症状**: Application failed to respond

**対処法**:
1. 環境変数が正しいか確認
2. ログで「🚀 サーバーが起動しました」が出ているか確認
3. PORTを環境変数で設定（`process.env.PORT`を使用）

### キャッシュが作成されない

**症状**: キャッシュ: 0人と表示される

**対処法**:
1. 環境変数の`U_ID`と`SECRET`が正しいか確認
2. ログでエラーメッセージを確認
3. 42 APIキーが有効か確認

### 503 Service Unavailable

**症状**: アプリにアクセスできない

**対処法**:
1. Renderの無料プランはアイドル時にスリープします
2. 初回アクセス時は起動に30秒～1分かかります
3. リロードしてみてください

---

## 💡 Tips

### Freeプランの制限

- スリープ: 15分間アクセスがないとスリープ
- 起動: 初回アクセス時に30秒～1分で起動
- 月間時間: 750時間/月（約31日）

### スリープを防ぐ方法

外部サービス（UptimeRobot等）で定期的にアクセス：

```
https://YOUR-APP-NAME.onrender.com/api/cache/status
```

5分ごとにアクセスすればスリープしません

### パフォーマンス向上

有料プラン（$7/月〜）にアップグレード：
- スリープなし
- より高速
- カスタムドメイン

---

## 📞 サポート

問題が解決しない場合：

1. [Render Documentation](https://render.com/docs)
2. [Render Community](https://community.render.com)
3. GitHubリポジトリのIssues

---

**完了です！🎉**

あなたのアプリが世界中からアクセス可能になりました！


# ✅ デプロイ前チェックリスト

## 📋 コード準備

- [ ] `.env`ファイルが`.gitignore`に含まれている
- [ ] `node_modules/`が`.gitignore`に含まれている
- [ ] `package.json`に正しい`start`スクリプトがある
- [ ] ローカルで正常に動作することを確認
- [ ] すべての変更をコミット

```bash
git add .
git commit -m "Ready for deployment"
```

---

## 🔐 セキュリティチェック

- [ ] `.env`ファイルがGitHubにプッシュされていない
- [ ] APIキーがコード内にハードコードされていない
- [ ] `.env.example`を作成（実際の値は含まない）

確認コマンド:
```bash
# .envが含まれていないことを確認
git log --all --full-history -- .env
# 出力が空ならOK
```

---

## 📦 GitHubリポジトリ

- [ ] GitHubリポジトリを作成
- [ ] リポジトリをpublic/privateに設定
- [ ] コードをプッシュ

```bash
git remote add origin https://github.com/YOUR_USERNAME/findreviewer.git
git branch -M main
git push -u origin main
```

---

## 🚀 Render.com デプロイ

- [ ] Render.comアカウント作成
- [ ] GitHubと連携
- [ ] 新しいWeb Serviceを作成
- [ ] 設定:
  - [ ] Name: `findreviewer`
  - [ ] Region: `Singapore`
  - [ ] Branch: `main`
  - [ ] Runtime: `Node`
  - [ ] Build Command: `npm install`
  - [ ] Start Command: `npm start`
  - [ ] Plan: `Free`
- [ ] 環境変数を設定:
  - [ ] `U_ID` = (あなたの42 API UID)
  - [ ] `SECRET` = (あなたの42 API Secret)
  - [ ] `PORT` = `3000`
- [ ] デプロイを実行

---

## ✨ デプロイ後確認

- [ ] URLにアクセスできる
- [ ] トップページが表示される
- [ ] キャッシュが作成される（1-2分待つ）
- [ ] 課題リストが表示される
- [ ] 検索が動作する
- [ ] 検索結果が表示される
- [ ] キャッシュ更新ボタンが動作する

確認URL:
```
https://YOUR-APP-NAME.onrender.com
https://YOUR-APP-NAME.onrender.com/api/cache/status
https://YOUR-APP-NAME.onrender.com/api/projects
```

---

## 📊 パフォーマンステスト

- [ ] 検索速度をチェック（1ms未満が理想）
- [ ] キャッシュ情報が正しく表示される
- [ ] 複数の課題で検索テスト
- [ ] キャッシュ自動更新が動作する（5分後）

---

## 🔧 オプション設定

- [ ] カスタムドメインを設定（Renderで可能）
- [ ] HTTPSが有効（Renderは自動）
- [ ] 自動デプロイを設定（GitHubプッシュ時）

---

## 📢 公開

- [ ] URLを42Tokyoの仲間に共有
- [ ] Slackやdiscordで告知
- [ ] READMEにライブURLを追加

---

## 🆘 トラブルシューティング

### デプロイが失敗する場合

1. ログを確認
2. 環境変数が正しいか確認
3. `package.json`の`scripts`を確認
4. Node.jsバージョンを確認

### アプリが動かない場合

1. Renderのログを確認
2. 環境変数が設定されているか確認
3. 42 APIキーが有効か確認
4. ポート番号を確認（`process.env.PORT`を使用）

### キャッシュが作成されない場合

1. サーバーログを確認
2. 42 APIのレート制限に達していないか確認
3. APIキーの権限を確認

---

## 📝 メモ

デプロイURL:
```
https://_____________________.onrender.com
```

デプロイ日時:
```
____年____月____日
```

---

**すべてチェックが完了したら、デプロイ成功です！🎉**


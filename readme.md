# 🧭 Find Reviewer

このスクリプトは **42Tokyo校舎に現在ログイン中の学生の中から、指定した課題で100点以上を取っている人を探す** ためのツールです。

---

## 📦 準備

1. **GitHubからクローン**

   ```bash
   git clone git@github.com:nyhm/Find_reviewer.git
   cd Find_reviewer
   ```

2. **`.env` ファイルを作成**
   `intra.42.fr` の **API settings** ページで取得した `UID` と `SECRET` を使って
   以下のように `.env` ファイルを作成してください：

   ```bash
   U_ID="u-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
   SECRET="s-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
   PROJECT_NAME="CPP Module 09"
   ```

   * `U_ID` と `SECRET`：intraのアプリ設定から取得
   * `PROJECT_NAME`：調べたい課題名（例: `"CPP Module 09"`）

---

## 🚀 実行方法

```bash
bash API.sh
```

スクリプトが自動的に：

1. intra.42.fr API から **アクセストークンを取得**
2. **現在校舎にログイン中の全ユーザーを取得**
3. 各ユーザーの `projects_users` をチェックして
   指定した課題の `final_mark >= 100` の人を抽出
4. 結果を `reviewer.txt` に保存

---

## 🧾 出力例

```
✅ Searching for users with 'CPP Module 09' = 100
Fetching page 1...
  Checking hnagashi...
  Checking rkawahar...
CPP Module 09 (hnagashi)
Fetching page 2...
✅ Done! Results saved to reviewer.txt
```

`reviewer.txt` の中身：

```
CPP Module 09 (hnagashi)
CPP Module 09 (yumatsui)
```

---

## ⚙️ 設定詳細

* デフォルトでは **1ページ=30人** × **100ページ=最大3000人** を対象に検索
* API制限(429 Too Many Requests)を避けるため、自動で適度に `sleep` します
* `.env` 内の `PROJECT_NAME` を変更することで任意の課題を調査可能

---

## ⚠️ 注意

* `.env` には **機密情報（APIキー）** が含まれるため、
  `.gitignore` に登録して **GitHubに絶対アップロードしないでください。**
* 42 APIの仕様により、1分間あたりのリクエスト数に制限があります。
  連続実行時は少し間をあけてください。

---

## 🧩 依存ツール

* `bash`
* `curl`
* `jq`

macOSの場合は以下でインストール可能：

```bash
brew install jq
```

---

## 📄 ライセンス

MIT License
© 2025 nyhm / Find Reviewer

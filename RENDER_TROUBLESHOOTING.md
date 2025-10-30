# 🆘 Render 403エラー トラブルシューティング

## 問題：トークン取得エラー 403

```
🔄 キャッシュを更新中...
トークン取得エラー: Request failed with status code 403
❌ キャッシュ更新エラー: Request failed with status code 403
```

---

## 🔍 原因チェックリスト

### ✅ Renderダッシュボードで確認

1. **あなたのサービスを選択**
2. **左メニュー「Environment」をクリック**
3. **以下を確認：**

#### ❌ よくある間違い

**間違い1: 引用符が含まれている**
```
U_ID = "u-s4t2ud-xxxxx"  ← ダメ！
SECRET = "s-s4t2ud-xxxxx" ← ダメ！
```

**間違い2: スペースがある**
```
U_ID =  u-s4t2ud-xxxxx   ← 前後にスペース
SECRET = s-s4t2ud-xxxxx  ← 後ろにスペース
```

**間違い3: 変数名が違う**
```
UID = ...    ← U_IDではない
API_SECRET = ... ← SECRETではない
```

#### ✅ 正しい設定

```
Key: U_ID
Value: u-s4t2

Key: SECRET
Value: s-s4t2u

Key: PORT
Value: 3000
```

**重要：引用符なし、スペースなし**

---

## 🛠️ 修正手順

### Step 1: 環境変数を削除して再作成

1. Renderダッシュボード → あなたのサービス
2. 左メニュー「**Environment**」
3. 既存の`U_ID`の右にある「**×**」をクリック → 削除
4. 既存の`SECRET`の右にある「**×**」をクリック → 削除
5. 「**Add Environment Variable**」をクリック

### Step 2: 正しい値を入力

**U_ID を追加：**
```
Key: U_ID
Value: u-s4t2ud-
```
**引用符を絶対に入れない！**

**SECRET を追加：**
```
Key: SECRET
Value: s-s4t2u
```
**引用符を絶対に入れない！**

### Step 3: 保存して再デプロイ

1. 「**Save Changes**」をクリック
2. 自動的に再デプロイが始まる
3. 5-10分待つ

---

## 📊 ログで確認

### Renderのログを見る方法

1. Renderダッシュボード → あなたのサービス
2. 左メニュー「**Logs**」をクリック
3. 以下のログを確認：

**成功の場合：**
```
🚀 サーバーが起動しました: http://0.0.0.0:3000
📍 42Tokyo レビュワー検索システム
🔄 キャッシュを更新中...
📡 校舎内のユーザー情報を取得中...
✅ 合計 XX人のアクティブユーザーを取得
```

**失敗の場合：**
```
トークン取得エラー: Request failed with status code 403
❌ キャッシュ更新エラー
```

---

## 🔬 デバッグ方法

### ローカルでテスト（既に成功）

```bash
# ローカルの.envが正しいことを確認
cat .env

# APIキーのテスト（成功することを確認済み）
curl -s -X POST https://api.intra.42.fr/oauth/token \
  -d "grant_type=client_credentials" \
  -d "client_id=u-s4" \
  -d "client_secret=s-s4t2ud-"
```

→ ローカルでは成功するので、**APIキーは有効**
→ 問題は**Renderの環境変数設定**

---

## 🎯 確実な方法：コピー&ペースト

### ローカルから正しい値を取得

```bash
# .envファイルから値を表示
cat .env
```

出力例：
```
U_ID="u-s4t2ud-eec5211b7f09451560"
SECRET="s-s4t2ud-be1a1500"
PORT=3000
```

### Renderに入力する値（引用符を削除）

```
U_ID の値: u-s4t2ud-eec5211b7f09451510
SECRET の値: s-s4t2ud-be1a157be5e230c0
```

**注意：** 引用符（"）は**含めない**

---

## 📸 正しい設定のスクリーンショット例

```
┌─────────────────────────────────────────────┐
│ Environment Variables                        │
├─────────────────────────────────────────────┤
│ Key: U_ID                                    │
│ Value: u-s4t2ud-eec5211b7f09451569941fb...  │
│                                         [×]  │
├─────────────────────────────────────────────┤
│ Key: SECRET                                  │
│ Value: s-s4t2ud-be1a157be5e230c8400f87b... │
│                                         [×]  │
├─────────────────────────────────────────────┤
│ Key: PORT                                    │
│ Value: 3000                                  │
│                                         [×]  │
└─────────────────────────────────────────────┘
```

---

## ⚡️ 最速の解決方法

1. **Renderの環境変数を全部削除**
2. **以下をコピー&ペーストで追加：**

```
Key: U_ID
Value: u-s4t2ud-eec

Key: SECRET
Value: s-s4t2ud-be1a157be5e230c8400f8
```

3. **Save Changes**
4. **5-10分待つ**
5. **Logsで確認**

---

## 🆘 それでもダメな場合

### 42 API アプリを確認

1. https://profile.intra.42.fr/oauth/applications にアクセス
2. あなたのアプリケーションを確認
3. 「Regenerate Secret」をクリック
4. 新しい`UID`と`SECRET`を取得
5. Renderの環境変数を新しい値に更新

---

## ✅ 成功の確認

### URLにアクセス

```
https://YOUR-APP-NAME.onrender.com/api/cache/status
```

**成功の場合：**
```json
{
  "userCount": 15,
  "totalProjects": 500,
  "lastUpdated": "2025-10-09T12:00:00.000Z",
  "isValid": true
}
```

**失敗の場合：**
```json
{
  "userCount": 0,
  "totalProjects": 0,
  "lastUpdated": null,
  "isValid": false
}
```

---

## 📞 サポート

問題が解決しない場合：
1. Renderのログをコピー
2. 環境変数のKey名をスクリーンショット（Valueは隠す）
3. GitHubのIssuesに投稿

---

**頑張ってください！🚀**


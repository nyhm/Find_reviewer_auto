#!/bin/bash

# --- .env 読み込み ---
if [ -f .env ]; then
  set -a
  source .env
  set +a
else
  echo "Error: .env file not found"
  exit 1
fi

# --- アクセストークン取得 ---
TOKEN=$(curl -s -X POST https://api.intra.42.fr/oauth/token \
  -d "grant_type=client_credentials" \
  -d "client_id=${U_ID}" \
  -d "client_secret=${SECRET}" \
  | jq -r '.access_token')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "Error: failed to get token"
  exit 1
fi

OUTPUT_FILE="reviewer.txt"
> "$OUTPUT_FILE"

echo "✅ Searching for users with '${PROJECT_NAME}' = 100"

# --- 校舎内ログイン中の人を30ページ分チェック ---
for i in {1..100}; do
  echo "Fetching page $i..."

  # 1ページ分のユーザー一覧を取得
  curl -s -H "Authorization: Bearer ${TOKEN}" \
    "https://api.intra.42.fr/v2/campus/26/users?page=$i&per_page=100" \
    | jq -r '.[] | select(.location != null) | .login' \
    | while read -r login; do
        [ -z "$login" ] && continue
        echo "  Checking $login..."
        
        DATA=$(curl -s -H "Authorization: Bearer $TOKEN" \
          "https://api.intra.42.fr/v2/users/$login/projects_users?per_page=100")

        echo "$DATA" | jq -r --arg PROJECT "$PROJECT_NAME" '
          .[]
          | select(.project.name == $PROJECT and .final_mark >= 100)
          | "\(.project.name) (\(.user.login))"
        ' >> "$OUTPUT_FILE"

        sleep 0.3
      done

  sleep 0.5
done

echo "✅ Done! Results saved to $OUTPUT_FILE"

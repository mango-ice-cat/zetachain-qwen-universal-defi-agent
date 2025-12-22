#!/usr/bin/env bash
set -euo pipefail

if [ -z "${ZETACHAIN_RPC_URL:-}" ]; then
  echo "Missing ZETACHAIN_RPC_URL"
  exit 1
fi

if [ -z "${DEPLOYER_PRIVATE_KEY:-}" ]; then
  echo "Missing DEPLOYER_PRIVATE_KEY (without 0x)"
  exit 1
fi

cd "$(dirname "$0")/.."

echo "Deploying ZetaBatchExecutor..."
DEPLOY_OUTPUT=$(npx hardhat run scripts/deploy-batch-executor.js --network zetachain_testnet)
echo "$DEPLOY_OUTPUT"

DEPLOYED_ADDRESS=$(echo "$DEPLOY_OUTPUT" | awk -F': ' '/ZetaBatchExecutor deployed at:/ {print $2}' | tail -n 1)

if [ -z "$DEPLOYED_ADDRESS" ]; then
  echo "Failed to parse deployed address."
  exit 1
fi

ENV_FILE=".env"
if [ ! -f "$ENV_FILE" ]; then
  touch "$ENV_FILE"
fi

if grep -q "^ZETACHAIN_BATCH_EXECUTOR=" "$ENV_FILE"; then
  sed -i.bak "s|^ZETACHAIN_BATCH_EXECUTOR=.*|ZETACHAIN_BATCH_EXECUTOR=$DEPLOYED_ADDRESS|" "$ENV_FILE"
  rm -f "${ENV_FILE}.bak"
else
  echo "ZETACHAIN_BATCH_EXECUTOR=$DEPLOYED_ADDRESS" >> "$ENV_FILE"
fi

echo "Set ZETACHAIN_BATCH_EXECUTOR=$DEPLOYED_ADDRESS in $ENV_FILE"
echo "Done. Restart backend to apply the new executor address."

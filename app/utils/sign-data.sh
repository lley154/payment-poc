#!/usr/bin/bash
node /home/lawrence/src/payment-poc/app/utils/src/cardano-signer.js sign --data $1 --secret-key /home/lawrence/.local/keys/testnet/admin/key.skey --json-extended | jq -r '.signature' 

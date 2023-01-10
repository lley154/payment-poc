# Payment POC Repository
## Getting Started
Copy the repo and install the npm dependancies
```
git clone https://github.com/lley154/payment-poc.git
cd payment-poc
sudo npm install --global yarn
npm install
yarn dev
```
Next you will need to add following bash shell environment variables to your .bashrc file
```
export NEXT_PUBLIC_SHOP="https://your-store.myshopify.com/"           # Your test store URL
export NEXT_PUBLIC_ACCESS_TOKEN=""                                    # Shopify access token
export NEXT_PUBLIC_COIN_API_KEY=""                                    # Coin marketcap api key
export NEXT_PUBLIC_BLOCKFROST_API="https://cardano-preprod.blockfrost.io/api/v0"
export NEXT_PUBLIC_BLOCKFROST_API_KEY=""                              # Blockfrost api key
export NEXT_PUBLIC_SERVICE_FEE=500000                                 # Service fee to pay for tx costs
export NEXT_PUBLIC_NETWORK=Preprod
export NEXT_PUBLIC_EARTHTRUST_VAL_ADDR=addr_test1wrz803x4p3xlntqth0l8reljp0ygz6fz7zyxjxp7mc50t8cz8et8u
```



# Payment POC

## Setting up to test the traceability smart contracts

Please add the following to your ~/.bashrc file
```
export NEXT_PUBLIC_BLOCKFROST_API_KEY="xxx"
export SHOP="https://xxx.myshopify.com/"            # Your test store URL
export ACCESS_TOKEN="xxx"
export SCOPES="write_orders, read_orders, read_products"                 # Your app's required scopes
export HOST="localhost"          # Your app's host, without the protocol prefix (in this case we used an `ngrok` tunnel to provide a secure connection to our localhost)
export HOST_SCHEME="http" # Either http or https. Note http is intended for local development with localhost.
export COIN_API_KEY="xxx"
```

Install npm dependancies
```
sudo npm install --global yarn
cd littercoin/app
[whatif/app]$ npm install 
[whatif/app]$ yarn dev
yarn run v1.22.19
$ next dev
ready - started server on 0.0.0.0:3000, url: http://localhost:3000
event - compiled client and server successfully in 1702 ms (173 modules)
```

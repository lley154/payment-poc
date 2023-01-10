# Payment POC Repository
## The Objective
The objective of this POC was to test payment with Ada from a Shopify site using a basic Shopify plan with minimal checkout customization.
This POC was used for the [donation traceability project](https://github.com/lley154/traceability-smart-contract) and below are end-to-end sequence diagrams showing the calls required to make this work.

### Commerce Sequence Diagram #1 - Lock Ada @ Smart Contract
![image](https://user-images.githubusercontent.com/7105016/211667690-e5754324-b7d7-4bb2-a36a-ba72c1ff83f0.png)


### Commerce Sequence Diagram #2 - Unlock Ada @ Smart Contract
![image](https://user-images.githubusercontent.com/7105016/211667755-e5a0f766-ae8b-488e-8506-02d56162b985.png)


## Getting Started

### Shopify Setup
We need to update the Shopify store so when an order is placed, there is a link to pay with Ada.
1) In Settings, select Apps and sales channels
2) Select Develop apps for your store
3) Select Allow custom app development
4) Select Allow customer app develompment again
5) Create an app
6) Enter the name of the app, eg. "Pay With Ada" 
7) Select Create app
8) Select Configure Admin API scopes
9) Scroll down and enable in the Order section, write_orders and read_orders
10) Scroll down and enable in the Products section, read_products
11) Go to the bottom of the page and press Save
12) Now select the API credentials tab
13) In the Access tokens box, select Install app
14) A prompt will ask you if you want to install your app, select Install
15) Go back to the main settings menu and select Payments
16) Select Add manual payment method
17) In the dialog box, enter the name of the payment method. eg "Pay With Ada"
18) Add additional details if required. eg "Paying with Ada using your Cardano Wallet"
19) Add payment instruction.  eg. "Please select to the Pay Now With Ada link below to pay using your Cardano Wallet"
20) Go back to the main settings menu and Select Checkout
21) Scroll to the bottom of the page and add the following to the Additional scripts window

```
<script>
    Shopify.Checkout.OrderStatus.addContentBox(
    '<h2 style="color:red;">Pay To Complete Your Order</h2>',
    '<a href="#" id="paynow">Pay Now In Ada</a>'
    );
    var urlStr = "http://localhost:3000/";
    var url = new URL(urlStr);
    var params = url.searchParams;
    params.append("id", Shopify.checkout.order_id);

    function updatePayNow () {
      document.getElementById("paynow").href=url
    }

    document.addEventListener("DOMContentLoaded", function() {
      updatePayNow()
    });
</script>
```
22) Select Save

### Environment variables

You will need to add following bash shell environment variables to your .bashrc file
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
### Install and build the Next.js web app
Copy the repo and install the npm dependancies
```
git clone https://github.com/lley154/payment-poc.git
cd payment-poc
sudo npm install --global yarn
npm install
yarn dev
```
You will see the following
```
lawrence@lawrence-iMac:~/src/payment-poc$ yarn dev
yarn run v1.22.19
$ next dev
ready - started server on 0.0.0.0:3000, url: http://localhost:3000
event - compiled client and server successfully in 1744 ms (173 modules)
```

### Now go to your store and place an order with Ada!







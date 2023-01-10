import type { NextPage } from 'next'
import Head from 'next/head'
import styles from '../styles/Home.module.css'
import { useState, useEffect } from "react";
import BuyProduct from '../components/BuyProduct';

import { 
  Blockfrost, 
  C, 
  Constr,
  Data,
  Lucid,
  Network,
  TxHash, 
  utf8ToHex,
  } from "lucid-cardano"; // NPM

  
  export async function getServerSideProps(context : any) {
  
    // set in env variables
    const orderId = (parseInt(context.query.id) || 0).toString();
    const shop = process.env.NEXT_PUBLIC_SHOP as string;
    const token = process.env.NEXT_PUBLIC_ACCESS_TOKEN as string;
    const uri = "admin/api/2022-10/orders/";
    const url = shop + uri + orderId + ".json";
    const serviceFee = 500000  // in lovelace
    const serviceFeeAda = serviceFee / 1000000   // in Ada

    try {

      const req = await fetch(url,{
        
        headers: {
          'Access-Control-Allow-Origin': '*',
          'X-Shopify-Access-Token': token,
          'Content-Type': 'application/json',                  
        },
        method: 'GET'
      });

      const orderData = await req.json();

      const adaUrl = "https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest?symbol=ADA&convert=USD";
      const adaReq = await fetch(adaUrl, { 
        headers: {
          'Access-Control-Allow-Origin': '*',
          'X-CMC_PRO_API_KEY': process.env.NEXT_PUBLIC_COIN_API_KEY as string,
          'Content-Type': 'application/json',
        },
        method: 'GET'
      });

      const adaData = await adaReq.json();
      const adaPrice : number = adaData.data.ADA[0].quote.USD.price;

      if (!orderData.errors) {
        const adaAmount = (orderData.order.total_price / adaPrice) + serviceFeeAda;
        const orderInfo = {
          order_id : orderData.order.id as string,
          total : orderData.order.total_price,
          ada_amount : adaAmount.toFixed(2),
          shop : shop,
          access_token : token,
          ada_usd_price : adaPrice.toFixed(5),
          tx_id : ""
        }
        return { props: orderInfo };

      } else {
        const orderInfo = {
          order_id : "0",
          total : 0,
          ada_amount : 0,
        }
        return { props: orderInfo };
      }
    } catch (err) {
      console.log('getServerSideProps', err);
    } 
    return { props: undefined };
  }

const Home: NextPage = (props) => {

  const [whichWalletSelected, setWhichWalletSelected] = useState(undefined);
  const [walletIsEnabled, setWalletIsEnabled] = useState(false);
  const [API, setAPI] = useState<undefined | any>(undefined);
  const [wInfo, setWalletInfo] = useState({ balance : ''});
  const [tx, setTx] = useState({ txId : '' });
  const [orderInfo, setId] = useState<undefined | any>(props);

  useEffect(() => {
    const checkWallet = async () => {
      
      setWalletIsEnabled(await checkIfWalletFound());
    }
    checkWallet();
  }, [whichWalletSelected]); 

  useEffect(() => {
    const enableSelectedWallet = async () => {
      if (walletIsEnabled) {
        const api = await enableWallet();
        setAPI(api);
      }
    }
    enableSelectedWallet();
  }, [walletIsEnabled]); 

  useEffect(() => {
    const updateWalletInfo = async () => {

        if (walletIsEnabled) {
            const _balance = await getBalance() as string;
            setWalletInfo({
              ...wInfo,
              balance : _balance
            });
        }           
    }
    updateWalletInfo();
  }, [API]);


  // user selects what wallet to connect to
  const handleWalletSelect = (obj : any) => {
    const whichWalletSelected = obj.target.value
    setWhichWalletSelected(whichWalletSelected);
  }

  const checkIfWalletFound = async () => {
      
    let walletFound = false;

    const walletChoice = whichWalletSelected;
    if (walletChoice === "eternl") {
        walletFound = !!window?.cardano?.eternl;
    } else if (walletChoice === "flint") {
        walletFound = !!window?.cardano?.flint;
    } else if (walletChoice === "nami") {
      walletFound = !!window?.cardano?.nami;
    } else if (walletChoice === "yoroi") {
      walletFound = !!window?.cardano?.yoroi;
    } 
    return walletFound;
  }

  const enableWallet = async () => {

    let walletAPI = undefined;
      try {
  
        const walletChoice = whichWalletSelected;
        if (walletChoice === "nami") {
          walletAPI = await window.cardano.nami.enable();
      } else if (walletChoice === "eternl") {
          walletAPI = await window.cardano.eternl.enable();
      } else if (walletChoice === "flint") {
        walletAPI = await window.cardano.flint.enable();
      } else if (walletChoice === "yoroi") {
        walletAPI = await window.cardano.yoroi.enable();
      }
        return walletAPI 
    } catch (err) {
        console.log('enableWallet error', err);
    }
  }

  const getBalance = async () => {
    try {
        const balanceCBORHex = await API.getBalance();
        const balanceAmount = C.Value.from_bytes(Buffer.from(balanceCBORHex, "hex")).coin();
        const walletBalance : BigInt = BigInt(balanceAmount.to_str());
        return walletBalance.toLocaleString();
    } catch (err) {
        console.log('getBalance error', err);
    }
  }

  const buyProduct = async () : Promise<TxHash> => {
  
    const serviceFee = process.env.NEXT_PUBLIC_SERVICE_FEE as string;
    const api_key : string = process.env.NEXT_PUBLIC_BLOCKFROST_API_KEY as string;
    const blockfrost_url = process.env.NEXT_PUBLIC_BLOCKFROST_API as string;
    const network : Network = process.env.NEXT_PUBLIC_NETWORK as Network;
    const earthtrustValAddr = process.env.NEXT_PUBLIC_EARTHTRUST_VAL_ADDR as string;
 
    const lucid = await Lucid.new(
      new Blockfrost(blockfrost_url, api_key),
      network,
    );

    lucid.selectWallet(API);

    const lovelaceAmount : string = ((orderInfo.ada_amount as number) * 1000000).toFixed(0);
    const adaUsdPrice : string = orderInfo.ada_usd_price;
    const orderId : string = orderInfo.order_id;
 
    /*
     Datum {
      order_amount : int
      order_info : string
      ada_price : string
     }
    */

    const newDatum = Data.to(new Constr(0, [(BigInt(lovelaceAmount) - BigInt(serviceFee)), 
                                            utf8ToHex(orderId),
                                            utf8ToHex(adaUsdPrice)]));

    const tx = await lucid
      .newTx()
      .payToContract(earthtrustValAddr, { inline: newDatum }, { ["lovelace"] : BigInt(lovelaceAmount) })
      .complete();

    const signedTx = await tx.sign().complete();

    const txHash = await signedTx.submit();
    console.log("txHash", txHash);
    setTx({ txId: txHash });

    const updateOrderInfo = {
      ...orderInfo,
      tx_id : txHash
    }

    const response = await fetch('/api/updateOrder', {
      method: 'POST',
      body: JSON.stringify({ updateOrderInfo }),
      headers: {
        'Content-type' : 'application/json',
      },
    }) 
    const data = await response.json();
    console.log("updateOrder", data);
    return txHash;
  } 

  return (
    <div className={styles.container}>
    <Head>
      <title>Shopify POC</title>
      <meta name="description" content="Shopify POC" />
      <link rel="icon" href="/favicon.ico" />
    </Head>

    <main className={styles.main}>
      <h3 className={styles.title}>
        Shopify POC
      </h3>

      <div className={styles.borderwallet}>
          <p>
            Connect to your wallet 
          </p>
          <p className={styles.borderwallet}>
            <input type="radio" id="eternl" name="wallet" value="eternl" onChange={handleWalletSelect}/>
              <label>Eternl</label>
          </p>
          <p className={styles.borderwallet}>
            <input type="radio" id="flint" name="wallet" value="flint" onChange={handleWalletSelect}/>
              <label>Flint</label>
          </p>
          <p className={styles.borderwallet}>
            <input type="radio" id="nami" name="wallet" value="nami" onChange={handleWalletSelect}/>
              <label>Nami</label>
          </p>
          <p className={styles.borderwallet}>
            <input type="radio" id="yoroi" name="wallet" value="yoroi" onChange={handleWalletSelect}/>
              <label>Yoroi</label>
          </p>
        </div>
          {tx.txId && <div className={styles.border}><b>Transaction Success!!!</b>
          <p>TxId &nbsp;&nbsp;<a href={"https://preprod.cexplorer.io/tx/" + tx.txId} target="_blank" rel="noopener noreferrer" >{tx.txId}</a></p>
          <p>Please wait until the transaction is confirmed on the blockchain and reload this page before doing another transaction</p>
        </div>}
        {walletIsEnabled && !tx.txId && <div className={styles.border}><BuyProduct onBuyProduct={buyProduct} orderInfo={orderInfo}/></div>}

    </main>

    <footer className={styles.footer}>

    </footer>
  </div>
    
  )
}

export default Home

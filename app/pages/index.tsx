import type { NextPage } from 'next'
import Head from 'next/head'
import styles from '../styles/Home.module.css'
import { useState, useEffect } from "react";
import WalletInfo from '../components/WalletInfo';
import BuyProduct from '../components/BuyProduct';
import { 
  Address, 
  TxHash,
  Blockfrost, 
  C, 
  Data,
  Lucid, 
  SpendingValidator,
  } from "lucid-cardano"; // NPM

  
  export async function getServerSideProps(context) {
    const orderId = (parseInt(context.query.id) || 0).toString();
    const shop = process.env.SHOP as string;
    const token = process.env.ACCESS_TOKEN as string;
    const uri = "admin/api/2022-10/orders/";
    const url = shop + uri + orderId + ".json";
    console.log("url", url);

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
          'X-CMC_PRO_API_KEY': process.env.COIN_API_KEY as string,
          'Content-Type': 'application/json',
        },
        method: 'GET'
      });

      const adaData = await adaReq.json();
      const adaPrice : number = adaData.data.ADA[0].quote.USD.price;
      //console.log("orderData", orderData);
      //console.log("adaData", adaData);

      if (!orderData.errors) {
        const adaAmount = orderData.order.total_price / adaPrice + 1.25; // adding 1.25 Ada to include tx fees
        const orderInfo = {
          order_id : orderData.order.id,
          total : orderData.order.total_price,
          ada_amount : adaAmount.toFixed(2),
          shop : shop,
          access_token : token,
          ada_usd_price : adaPrice.toFixed(5),

        }
        return { props: orderInfo };

      } else {
        const orderInfo = {
          order_id : 0,
          total : 0,
          ada_amount : 0,
        }
        return { props: orderInfo };
      }
    } catch (err) {
      console.log('getServerSideProps', err);
    } 
  }

  const alwaysSucceedScript: SpendingValidator = {
    type: "PlutusV2",
    script: "49480100002221200101",
  };
  
  const Datum = () => Data.empty();
  const Redeemer = () => Data.empty();


const Home: NextPage = (props) => {

  const [whichWalletSelected, setWhichWalletSelected] = useState(undefined);
  const [walletIsEnabled, setWalletIsEnabled] = useState(false);
  const [API, setAPI] = useState<undefined | any>(undefined);
  const [wInfo, setWalletInfo] = useState({ balance : ''});
  const [tx, setTx] = useState({ txId : '' });
  const [txStatus, setTxStatus] = useState({ txStatus : '' });
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

  useEffect(() => {
    const updateOrder = async () => {

        if (txStatus.txStatus == "SUBMITTED") {

          const uri = "admin/api/2022-10/orders/";
          const url = orderInfo.shop + uri + orderInfo.order_id + ".json";
          const today = new Date();
          console.log("Use Effect url", url);

          const ada_amount : string = orderInfo.ada_amount;
          const ada_usd_price : string = orderInfo.ada_usd_price;
          const note_ada =  "Ada Amount = " + ada_amount;
          const note_ada_usd = " | Ada/USD Price = " + ada_usd_price;
          const note = note_ada + note_ada_usd;
          const tags = "Ada Payment Status: " + txStatus.txStatus; 

          const order_update = { 
              order : {
                id : orderInfo.order_id,
                tags : tags,
                note : note,
                note_attributes : [ { ada_amount : ada_amount,
                                     ada_usd_price : ada_usd_price as string,
                                     date : today,
                                     tx : tx.txId } ]
              }
            }
          
          console.log("use Effect - order update", JSON.stringify(order_update));
          const req = await fetch(url, {
            body : JSON.stringify(order_update),
            headers: {
              'Access-Control-Allow-Origin': '*',
              'X-Shopify-Access-Token': orderInfo.access_token,
              'Content-Type': 'application/json',
                       
            },
            method: 'PUT'
          });
          const updateStatus = await req.json();
          console.log("use effect - order update response", updateStatus);
        }           
    }
    updateOrder();
  }, [txStatus]);


  // user selects what wallet to connect to
  const handleWalletSelect = (obj : any) => {
    const whichWalletSelected = obj.target.value
    setWhichWalletSelected(whichWalletSelected);
  }

  const checkIfWalletFound = async () => {
      
    let walletFound = false;

    const walletChoice = whichWalletSelected;
    if (walletChoice === "nami") {
        walletFound = !!window?.cardano?.nami;
    } else if (walletChoice === "eternl") {
        walletFound = !!window?.cardano?.eternl;
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
  
    const api_key : string = "previewahbEiO6qnhyFm5a9Q1N55LabbIX8ZIde";
    const lucid = await Lucid.new(
      new Blockfrost("https://cardano-preview.blockfrost.io/api/v0", api_key),
      "Preview",
    );
  
    lucid.selectWallet(API);

    const alwaysSucceedAddress: Address = lucid.utils.validatorToAddress(
      alwaysSucceedScript,
    );
    console.log("alwaysSucceedAddress", alwaysSucceedAddress);

    /*
    const referenceScriptUtxo = (await lucid.utxosAt(alwaysSucceedAddress)).find(
      (utxo) => Boolean(utxo.scriptRef),
    );
    if (!referenceScriptUtxo) throw new Error("Reference script not found");
  
    const utxo = (await lucid.utxosAt(alwaysSucceedAddress)).find((utxo) =>
      utxo.datum === Datum() && !utxo.scriptRef
    );
    if (!utxo) throw new Error("Spending script utxo not found");
    */
    
    const tx = await lucid
    .newTx()
    .payToContract(alwaysSucceedAddress, { inline: Datum() }, { ["lovelace"] : BigInt((orderInfo.ada_amount - 1.25 ) * 1000000)}) // remove 1 Ada for tx fee
    .payToContract(alwaysSucceedAddress, {
      asHash: Datum(),
      scriptRef: alwaysSucceedScript, // adding plutusV2 script to output
    }, {})
    .complete();


    /*
    const tx = await lucid
      .newTx()
      .collectFrom([utxo], Redeemer())
      .attachSpendingValidator(alwaysSucceedScript)
      .complete();
    */

    /*
    const tx = await lucid
    .newTx()
    .readFrom([referenceScriptUtxo]) // spending utxo by reading plutusV2 from reference utxo
    .collectFrom([utxo], Redeemer())
    .complete();
    */

    const signedTx = await tx.sign().complete();
  
    const txHash = await signedTx.submit();
    console.log("txHash", txHash);
    setTx({ txId: txHash });
    setTxStatus({txStatus : "SUBMITTED"});
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
            <input type="radio" id="nami" name="wallet" value="nami" onChange={handleWalletSelect}/>
              <label>Nami</label>
          </p>
        </div>
          {tx.txId && <div className={styles.border}><b>Transaction Success!!!</b>
          <p>TxId &nbsp;&nbsp;<a href={"https://preview.cexplorer.io/tx/" + tx.txId} target="_blank" rel="noopener noreferrer" >{tx.txId}</a></p>
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

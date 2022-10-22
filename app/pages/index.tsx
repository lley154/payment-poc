import type { NextPage } from 'next'
import Head from 'next/head'
//import Image from 'next/image'
import styles from '../styles/Home.module.css'
import { useState, useEffect } from "react";
import WalletInfo from '../components/WalletInfo';
import BuyProduct from '../components/BuyProduct';
import { useRouter } from 'next/router';
import { 
  Address, 
  TxHash,
  Unit,
  utf8ToHex,
  Blockfrost, 
  C, 
  Constr, 
  Data,
  Json, 
  Lucid, 
  PlutusData, 
  SpendingValidator,
  } from "lucid-cardano"; // NPM


  export async function getServerSideProps(context) {
    const orderId = (parseInt(context.query.id) || 0).toString();
    // Here we got the order id query parameter from Context
    // Default value is "0"

    const shop = process.env.SHOP as string;
    const uri = "/admin/api/2022-10/orders/";
    const url = shop + uri + orderId + ".json";
    console.log("url", url);

    const req = await fetch(url,{
   
      //body: JSON.stringify({ id: 1 }),
      
      headers: {
        'Access-Control-Allow-Origin': '*',
        'X-Shopify-Access-Token': process.env.ACCESS_TOKEN as string,
        'Content-Type': 'application/json',
                 
      },
      method: 'GET'
    });
    const newData = await req.json();


    const orderData = {
      orderId : newData.order.id,
      total_price : newData.order.total_price,
    }
    console.log(orderData);

    return { props: orderData };
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
  const router = useRouter();
  const [orderData, setId] = useState<undefined | any>(props);


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
    if (walletChoice === "nami") {
        walletFound = !!window?.cardano?.nami;
    } else if (walletChoice === "eternl") {
        walletFound = !!window?.cardano?.eternl;
    } 
    return walletFound;
  }

  /*
  const checkIfWalletEnabled = async () => {

    let walletIsEnabled = false;
    try {
        const walletChoice = whichWalletSelected;
        if (walletChoice === "nami") {
            walletIsEnabled = await window.cardano.nami.isEnabled();

        } else if (walletChoice === "eternl") {
            walletIsEnabled = await window.cardano.eternl.isEnabled();
    
        } 
    } catch (err) {
        console.log('checkIfWalletEnabled error', err);
    }
    return walletIsEnabled;
  }
*/

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

  const buyProduct = async (adaQty : any) : Promise<TxHash> => {
  
    const api_key : string = "previewahbEiO6qnhyFm5a9Q1N55LabbIX8ZIde";
    const lucid = await Lucid.new(
      new Blockfrost("https://cardano-preview.blockfrost.io/api/v0", api_key),
      "Preview",
    );
  
    lucid.selectWallet(API);

    const alwaysSucceedAddress: Address = lucid.utils.validatorToAddress(
      alwaysSucceedScript,
    );

    const referenceScriptUtxo = (await lucid.utxosAt(alwaysSucceedAddress)).find(
      (utxo) => Boolean(utxo.scriptRef),
    );
    if (!referenceScriptUtxo) throw new Error("Reference script not found");
  
    const utxo = (await lucid.utxosAt(alwaysSucceedAddress)).find((utxo) =>
      utxo.datum === Datum() && !utxo.scriptRef
    );
    if (!utxo) throw new Error("Spending script utxo not found");
  
    const tx = await lucid
      .newTx()
      .collectFrom([utxo], Redeemer())
      .attachSpendingValidator(alwaysSucceedScript)
      .complete();
  
    const signedTx = await tx.sign().complete();
  
    const txHash = await signedTx.submit();
    console.log("txHash", txHash);
    setTx({ txId: txHash });
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
          {walletIsEnabled && <div className={styles.border}><WalletInfo walletInfo={wInfo}/></div>}
          {tx.txId && <div className={styles.border}><b>Transaction Success!!!</b>
          <p>TxId &nbsp;&nbsp;<a href={"https://preview.cexplorer.io/tx/" + tx.txId} target="_blank" rel="noopener noreferrer" >{tx.txId}</a></p>
          <p>Please wait until the transaction is confirmed on the blockchain and reload this page before doing another transaction</p>
        </div>}
        {walletIsEnabled && !tx.txId && <div className={styles.border}><BuyProduct onBuyProduct={buyProduct} orderData={orderData}/></div>}
      
    </main>

    <footer className={styles.footer}>

    </footer>
  </div>
    

  )
}




export default Home

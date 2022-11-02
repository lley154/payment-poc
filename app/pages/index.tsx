import type { NextPage } from 'next'
import Head from 'next/head'
import styles from '../styles/Home.module.css'
import { useState, useEffect } from "react";
import BuyProduct from '../components/BuyProduct';
import AddScript from '../components/AddScript';

import { 
  Blockfrost, 
  C, 
  Constr,
  Data,
  Json, 
  Lucid,
  MintingPolicy,
  TxHash, 
  Unit,
  utf8ToHex,
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
          order_id : orderData.order.id as string,
          total : orderData.order.total_price,
          ada_amount : adaAmount.toFixed(2),
          shop : shop,
          access_token : token,
          ada_usd_price : adaPrice.toFixed(5),

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
  
    // ----------------------------------------------------------------------
    // Move these to env variables
    // ----------------------------------------------------------------------
    const tokenMintAddr : string = "addr_test1wzmta7y92yglmadefcuxtjefdtmlhnsyl3s02c64mprnndq9sh46x"; // minting policy address
    const policyId = "b6bef8855111fdf5b94e3865cb296af7fbce04fc60f56355d84739b4";
    const split = 95;
    const merchantAddress = "addr_test1vq7k907l7e59t52skm8e0ezsnmmc7h4xy30kg2klwc5n8rqug2pds"; 
    const donorAddress = "addr_test1vzetpfww4aaunft0ucvcrxugj8nt4lhltsktya0rx0uh48cqghjfg";
    const api_key : string = "preprodxg6GaNVZoHWUfQd7HQcgUg8epWhE1aMi";
    const lucid = await Lucid.new(
      new Blockfrost("https://cardano-preprod.blockfrost.io/api/v0", api_key),
      "Preprod",
    );
    // ----------------------------------------------------------------------
    const fraudAddress : string = "addr_test1vq5s7k4kwqz4rrfe8mm9jz9tpm7c5u93yfwwsaw708yxs5sm70qjg";

    lucid.selectWallet(API);
    
    //const lovelaceAmount = (orderInfo.ada_amount) * 1000000
    const lovelaceAmount = 10 * 1000000
    const merchantAmount = lovelaceAmount * split / 100
    const donorAmount = lovelaceAmount * (100 - split) / 100
    const unit: Unit = policyId + utf8ToHex("Earthtrust");
    const qty = BigInt(1);  // only 1 NFT token
    const mintRedeemer = Data.to(new Constr(0, [new Constr(1, []), BigInt(lovelaceAmount)]));
    const now = new Date();
    
    const orderDetails : Json = {
      "version": "1.0",   
      "donation_ada_amount": (donorAmount / 1000000).toLocaleString(),
      "total_ada_amount": (lovelaceAmount / 1000000).toLocaleString(),
      "donation_split" : (100 - split),
      "date": now, 
      "order_id":  orderInfo.order_id,  
    };

    const metaData : Json = {
      "order_details" : orderDetails
    }

    const referenceScriptUtxo = (await lucid.utxosAt(tokenMintAddr)).find(
      (utxo) => Boolean(utxo.scriptRef),
    );
    if (!referenceScriptUtxo) throw new Error("Reference script not found");

    console.log("lovelaceAmount", lovelaceAmount);
    console.log("merchantAmount", merchantAmount);
    console.log("donorAmount", donorAmount);


    const tx = await lucid
      .newTx()
      .mintAssets({ [unit]: qty }, mintRedeemer)
      .readFrom([referenceScriptUtxo]) // spending utxo by reading plutusV2 from reference utxo
      .payToAddress(merchantAddress, { ["lovelace"] : BigInt(merchantAmount) }) 
      .payToAddress(donorAddress, { ["lovelace"] : BigInt(donorAmount) })
      .attachMetadata(1, metaData)
      .complete();

    const signedTx = await tx.sign().complete();

    //    .payToAddress(donorAddress, { [unit] : qty })
  
    const txHash = await signedTx.submit();
    console.log("txHash", txHash);
    setTx({ txId: txHash });
    setTxStatus({txStatus : "SUBMITTED"});
    return txHash;
  } 

  const addScript = async () : Promise<TxHash> => {

    const tokenMintscript: MintingPolicy = {
      type: "PlutusV2",
      script: "590c67590c640100003323233223322323232323232323232323232323232323232323322323232323232323232323232323232323233223232323223223232232325335332232350032253350021330183301c491054e465450310053353233039503e00132350012222222222220085003103a22135002222533500413301d3301b00235012222220013301400148008884104cc060cc0712401054e465450320033300e3301d3500d222220035025303433503633320015037001500c4832004c06d400ccc0712401054e465450330033300e3301d3500d2222200250253034335036333200150370013233702906400800a80624190026036a006207426a002440046666ae68cdc39aab9d5005480008cc8848cc00400c008c0b0d5d0a8029bad357426ae8940148c98c80b8cd5ce0178170161999ab9a3370e6aae7540092000233221233001003002323232323232323232323232323333573466e1cd55cea8062400046666666666664444444444442466666666666600201a01801601401201000e00c00a00800600466a0500526ae854030cd40a00a4d5d0a80599a8140151aba1500a3335502d75ca0586ae854024ccd540b5d728161aba1500833502803435742a00e666aa05a06aeb4d5d0a8031919191999ab9a3370e6aae75400920002332212330010030023232323333573466e1cd55cea8012400046644246600200600466a082eb4d5d0a80118211aba135744a004464c6408866ae701141101084d55cf280089baa00135742a0046464646666ae68cdc39aab9d5002480008cc8848cc00400c008cd4105d69aba150023042357426ae8940088c98c8110cd5ce02282202109aab9e5001137540026ae84d5d1280111931902019ab9c04104003e135573ca00226ea8004d5d0a80299a8143ae35742a008666aa05a06240026ae85400cccd540b5d710009aba150023033357426ae8940088c98c80f0cd5ce01e81e01d09aba25001135744a00226ae8940044d5d1280089aba25001135744a00226ae8940044d5d1280089aba25001135744a00226aae7940044dd50009aba150023023357426ae8940088c98c80b8cd5ce017817016081689931901699ab9c491035054350002d135573ca00226ea80044d55cf280089baa001135001222220043200135503122225335001103022153355335323500122350082232335005233500425335333573466e3c0080040ec0e85400c40e880e88cd401080e894cd4ccd5cd19b8f00200103b03a15003103a1533500321533500221335002233500223350022335002233019002001203d2335002203d23301900200122203d222335004203d2225335333573466e1c01800c1000fc54cd4ccd5cd19b8700500204003f133014004001103f103f10381533500121038103835002222200413233355300e12001350125010235001223335530111200135015501323500122333500123300f4800000488cc0400080048cc03c00520000013355300d1200123500122335503a00233350012335530111200123500122335503e0023550130010012233355500e0140020012335530111200123500122335503e00235501200100133355500900f00100535002222200310321033133300600500400122333573466e1c0080040b80b4444888ccd54c0104800540bccd54c01c480048d400488cd540d0008d54024004ccd54c0104800488d4008894cd4ccd54c03048004c8cd404888ccd400c88008008004d40048800448cc004894cd400840d440040c88d400488cc028008014018400c4cd40cc01000d40c0004cd54c01c480048d400488c8cd540d400cc004014c8004d540d4894cd40044d5402800c884d4008894cd4cc03000802044888cc0080280104c01800c008c8004d540b888448894cd40044008884cc014008ccd54c01c480040140100044484888c00c0104484888c004010c8004d540ac8844894cd4004540b4884cd40b8c010008cd54c01848004010004c8004d540a888448894cd40044d400c88004884ccd401488008c010008ccd54c01c4800401401000488ccd5cd19b8f002001027026112330010020252253350021001102412335002223335003220020020013500122001122123300100300223500122222222222200a22533500110211335738004040446600c6026004a66a002426a018602460280022a0142464460046eb0004c8004d5408888cccd55cf80092811919a81118021aba100230033574400402e464646666ae68cdc39aab9d5002480008cc8848cc00400c008c034d5d0a80118029aba135744a004464c6402e66ae7006005c0544d55cf280089baa0012323232323333573466e1cd55cea8022400046666444424666600200a0080060046464646666ae68cdc39aab9d5002480008cc02cc05cd5d0a80119a80700a9aba135744a004464c6403866ae700740700684d55cf280089baa00135742a008666aa012eb94020d5d0a8019919191999ab9a3370ea0029002119091118010021aba135573ca00646666ae68cdc3a80124004464244460020086eb8d5d09aab9e500423333573466e1d400d20002122200323263201e33573803e03c03803603426aae7540044dd50009aba1500233500a75c6ae84d5d1280111931900c19ab9c019018016135744a00226ae8940044d55cf280089baa0012212330010030021335500175ceb44488c88c008dd5800990009aa80f11191999aab9f00225020233501f3355021300635573aa004600a6aae794008c010d5d100180a09aba100112232323333573466e1d400520002350073005357426aae79400c8cccd5cd19b875002480089401c8c98c8050cd5ce00a80a00900889aab9d5001137540022424460040062244002464646666ae68cdc3a800a400c46424444600800a600e6ae84d55cf280191999ab9a3370ea004900211909111180100298049aba135573ca00846666ae68cdc3a801a400446424444600200a600e6ae84d55cf280291999ab9a3370ea00890001190911118018029bae357426aae7940188c98c8048cd5ce00980900800780700689aab9d500113754002464646666ae68cdc39aab9d5002480008cc8848cc00400c008c014d5d0a8011bad357426ae8940088c98c8038cd5ce00780700609aab9e5001137540024646666ae68cdc39aab9d5001480008dd71aba135573ca004464c6401866ae700340300284dd5000919191919191999ab9a3370ea002900610911111100191999ab9a3370ea004900510911111100211999ab9a3370ea00690041199109111111198008048041bae35742a00a6eb4d5d09aba2500523333573466e1d40112006233221222222233002009008375c6ae85401cdd71aba135744a00e46666ae68cdc3a802a400846644244444446600c01201060186ae854024dd71aba135744a01246666ae68cdc3a8032400446424444444600e010601a6ae84d55cf280591999ab9a3370ea00e900011909111111180280418071aba135573ca018464c6402a66ae7005805404c04804404003c0380344d55cea80209aab9e5003135573ca00426aae7940044dd50009191919191999ab9a3370ea002900111999110911998008028020019bad35742a0086eb4d5d0a8019bad357426ae89400c8cccd5cd19b875002480008c020c024d5d09aab9e500623263200e33573801e01c01801626aae75400c4d5d1280089aab9e50011375400242446004006464646666ae68cdc3a800a400446424460020066eb8d5d09aab9e500323333573466e1d4009200023006375c6ae84d55cf280211931900519ab9c00b00a008007135573aa00226ea80048488c00800c488c8c8cccd5cd19b87500148010848880048cccd5cd19b875002480088c84888c00c010c018d5d09aab9e500423333573466e1d400d20002122200223263200a33573801601401000e00c26aae7540044dd50009191999ab9a3370ea0029001100711999ab9a3370ea0049000100711931900319ab9c007006004003135573a6ea80052612001490103505431002335009335500b002335009335500b002001500a500a4881001223370600400224466e08008004c8004d5401c8894cd40044008884d400888cc01cccc02000801800400cc8004d5401888894cd40044008884d4008894cd4ccd5cd19b87001480000280244ccc02001c01800c4ccc02001ccd402c48ccc00402000c00801800c4880084880044488008488488cc00401000c448848cc00400c008448c8c00400488cc00cc008008004cd4488ccccc0092012482f8052211c3d62bfdff66855d150b6cf97e4509ef78f5ea6245f642adf7629338c0048811cb2b0a5ceaf7bc9a56fe619819b8891e6bafeff5c2cb275e333f97a9f0048810a4561727468747275737400222221233333001006005004003002200101",
    };
  
    // ----------------------------------------------------------------------
    // Move these to env variables
    // ----------------------------------------------------------------------
    const tokenMintAddr : string = "addr_test1wzmta7y92yglmadefcuxtjefdtmlhnsyl3s02c64mprnndq9sh46x"; // minting policy address
    const api_key : string = "preprodxg6GaNVZoHWUfQd7HQcgUg8epWhE1aMi";
    const lucid = await Lucid.new(
      new Blockfrost("https://cardano-preprod.blockfrost.io/api/v0", api_key),
      "Preprod",
    );
    // ----------------------------------------------------------------------

    lucid.selectWallet(API);
    
    const Datum = () => Data.empty();

    const tx = await lucid
    .newTx()
    .payToContract(tokenMintAddr, {
      asHash: Datum(),
      scriptRef: tokenMintscript, // adding plutusV2 script to output
    }, { ["lovelace"] : BigInt(20000000) })
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
          {tx.txId && <div className={styles.border}><b>Transaction Success!!!</b>
          <p>TxId &nbsp;&nbsp;<a href={"https://preprod.cexplorer.io/tx/" + tx.txId} target="_blank" rel="noopener noreferrer" >{tx.txId}</a></p>
          <p>Please wait until the transaction is confirmed on the blockchain and reload this page before doing another transaction</p>
        </div>}
        {walletIsEnabled && !tx.txId && <div className={styles.border}><BuyProduct onBuyProduct={buyProduct} orderInfo={orderInfo}/></div>}
        {walletIsEnabled && !tx.txId && <div className={styles.border}><AddScript onAddScript={addScript}/></div>}

    </main>

    <footer className={styles.footer}>

    </footer>
  </div>
    
  )
}

export default Home

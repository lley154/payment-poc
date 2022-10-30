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
  Constr,
  Data,
  Json, 
  Lucid, 
  MintingPolicy,
  PolicyId,
  SpendingValidator,
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

      // get metadata signature
      /*
    const req = await fetch(url, {
      body : JSON.stringify(order_update),
      headers: {
        'Access-Control-Allow-Origin': '*',
        'X-Shopify-Access-Token': orderInfo.access_token,
        'Content-Type': 'application/json',
                 
      },
      method: 'PUT'
    });
 */

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

    const { paymentCredential } = lucid.utils.getAddressDetails(
      await lucid.wallet.address(),
    );

    /*

    const mintingPolicy: MintingPolicy = lucid.utils.nativeScriptFromJson(
      {
        type: "all",
        scripts: [
          { type: "sig", keyHash: paymentCredential?.hash! },
          {
            type: "before",
            slot: lucid.utils.unixTimeToSlot(Date.now() + 1000000),
          },
        ],
      },
    );
    
*/

    const mintingPolicy: MintingPolicy = {
      type: "PlutusV2",
      script:
        "590c5f590c5c01000033232332233223232323232323232323232323232323232323233223232323232323232323232323232323232332232323232232232323223232533533223235003222533500313301a3301e4901054e46545031005335323303b504000132350012222222222220085004103c22135002222533500413301f3301d002007330160014800888410ccc068cc0792401054e46545032003330103301f3500f22220025027303633503833320015039001500e4832004c0754010cc079241054e46545033003330103301f3500f222200150273036335038333200150390013233702906400800a8072419002603aa008207826a002440046666ae68cdc39aab9d5006480008ccc88848ccc00401000c008c0b4d5d0a8031bae35742a00a6eb4d5d09aba2500523263202f33573806005e05a6666ae68cdc39aab9d5002480008cc8848cc00400c008c8c8c8c8c8c8c8c8c8c8c8c8c8cccd5cd19b8735573aa018900011999999999999111111111110919999999999980080680600580500480400380300280200180119a8148151aba1500c33502902a35742a01666a0520566ae854028ccd540b9d728169aba150093335502e75ca05a6ae854020cd40a40d4d5d0a803999aa81701b3ad35742a00c6464646666ae68cdc39aab9d5002480008cc8848cc00400c008c8c8c8cccd5cd19b8735573aa004900011991091980080180119a8213ad35742a00460866ae84d5d1280111931902299ab9c046045043135573ca00226ea8004d5d0a8011919191999ab9a3370e6aae754009200023322123300100300233504275a6ae854008c10cd5d09aba2500223263204533573808c08a08626aae7940044dd50009aba135744a004464c6408266ae701081040fc4d55cf280089baa00135742a00a66a052eb8d5d0a802199aa81701910009aba150033335502e75c40026ae854008c0d0d5d09aba2500223263203d33573807c07a07626ae8940044d5d1280089aba25001135744a00226ae8940044d5d1280089aba25001135744a00226ae8940044d5d1280089aab9e5001137540026ae854008c090d5d09aba2500223263202f33573806005e05a205c264c6405c66ae71241035054350002e135573ca00226ea80044d5d1280089aab9e50011375400226a0024444006640026aa0624444a66a0022060442a66aa66a646a002446a010446466a00a466a0084a66a666ae68cdc780100081d81d0a801881d101d119a802101d1299a999ab9a3371e0040020760742a00620742a66a00642a66a0044266a004466a004466a004466a004466032004002407a466a004407a46603200400244407a44466a008407a444a66a666ae68cdc380300182001f8a99a999ab9a3370e00a00408007e266028008002207e207e20702a66a0024207020706a0044444008264666aa601c240026a024a02046a00244666aa6022240026a02aa02646a00244666a00246601e90000009119808001000919807800a400000266aa601a2400246a0024466aa074004666a002466aa60222400246a0024466aa07c0046aa02600200244666aaa01c028004002466aa60222400246a0024466aa07c0046aa024002002666aaa01201e00200a6a004444400620642066266600c00a00800244666ae68cdc3801000817016888911199aa980209000a81799aa98038900091a8009119aa81a0011aa804800999aa980209000911a80111299a999aa9806090009919a80911199a801910010010009a80091000891980091299a801081a880081911a80091198050010028030801899a819802001a81800099aa98038900091a800911919aa81a8019800802990009aa81a91299a80089aa8050019109a80111299a99806001004089111980100500209803001801190009aa8171108911299a800880111099802801199aa9803890008028020008890911180180208909111800802190009aa815910891299a8008a81691099a817180200119aa980309000802000990009aa8151108911299a80089a80191000910999a802910011802001199aa98038900080280200091199ab9a3371e00400204e04c2246600200404a44a66a004200220482466a00444666a006440040040026a00244002244246600200600446a00244444444444401444a66a0022042266ae7000808088cc018c04c0094cd400484d4030c048c0500045402848c88c008dd6000990009aa811111999aab9f00125023233502230043574200460066ae8800805c8c8c8cccd5cd19b8735573aa004900011991091980080180118069aba150023005357426ae8940088c98c805ccd5ce00c00b80a89aab9e5001137540024646464646666ae68cdc39aab9d5004480008cccc888848cccc00401401000c008c8c8c8cccd5cd19b8735573aa0049000119805980b9aba1500233500e015357426ae8940088c98c8070cd5ce00e80e00d09aab9e5001137540026ae854010ccd54025d728041aba150033232323333573466e1d4005200423212223002004357426aae79400c8cccd5cd19b875002480088c84888c004010dd71aba135573ca00846666ae68cdc3a801a400042444006464c6403c66ae7007c07807006c0684d55cea80089baa00135742a00466a014eb8d5d09aba2500223263201833573803203002c26ae8940044d5d1280089aab9e500113754002442466002006004266aa002eb9d6889119118011bab0013200135501e223233335573e0044a040466a03e66aa042600c6aae754008c014d55cf280118021aba200301413574200224464646666ae68cdc3a800a400046a00e600a6ae84d55cf280191999ab9a3370ea00490011280391931900a19ab9c015014012011135573aa00226ea800448488c00800c44880048c8c8cccd5cd19b875001480188c848888c010014c01cd5d09aab9e500323333573466e1d400920042321222230020053009357426aae7940108cccd5cd19b875003480088c848888c004014c01cd5d09aab9e500523333573466e1d40112000232122223003005375c6ae84d55cf280311931900919ab9c01301201000f00e00d135573aa00226ea80048c8c8cccd5cd19b8735573aa004900011991091980080180118029aba15002375a6ae84d5d1280111931900719ab9c00f00e00c135573ca00226ea80048c8cccd5cd19b8735573aa002900011bae357426aae7940088c98c8030cd5ce00680600509baa001232323232323333573466e1d4005200c21222222200323333573466e1d4009200a21222222200423333573466e1d400d2008233221222222233001009008375c6ae854014dd69aba135744a00a46666ae68cdc3a8022400c4664424444444660040120106eb8d5d0a8039bae357426ae89401c8cccd5cd19b875005480108cc8848888888cc018024020c030d5d0a8049bae357426ae8940248cccd5cd19b875006480088c848888888c01c020c034d5d09aab9e500b23333573466e1d401d2000232122222223005008300e357426aae7940308c98c8054cd5ce00b00a80980900880800780700689aab9d5004135573ca00626aae7940084d55cf280089baa0012323232323333573466e1d400520022333222122333001005004003375a6ae854010dd69aba15003375a6ae84d5d1280191999ab9a3370ea00490001180418049aba135573ca00c464c6401c66ae7003c03803002c4d55cea80189aba25001135573ca00226ea80048488c00800c8c8c8cccd5cd19b875001480088c8488c00400cdd71aba135573ca00646666ae68cdc3a801240004600c6eb8d5d09aab9e500423263200a33573801601401000e26aae7540044dd50009091180100189119191999ab9a3370ea00290021091100091999ab9a3370ea00490011190911180180218031aba135573ca00846666ae68cdc3a801a400042444004464c6401466ae7002c02802001c0184d55cea80089baa0012323333573466e1d40052002200e23333573466e1d40092000200e23263200633573800e00c00800626aae74dd5000a4c2400292103505431002335009335500b002335009335500b002001500a500a4881001223370600400224466e08008004c8004d5401c8894cd40044008884d400888cc01cccc02000801800400cc8004d5401888894cd40044008884d4008894cd4ccd5cd19b87001480000280244ccc02001c01800c4ccc02001ccd402c48ccc00402000c00801800c4880084880044488008488488cc00401000c448848cc00400c008448c8c00400488cc00cc008008004cd4488cccc0092002482f80522011c3d62bfdff66855d150b6cf97e4509ef78f5ea6245f642adf7629338c0048811cb2b0a5ceaf7bc9a56fe619819b8891e6bafeff5c2cb275e333f97a9f00222212333300100500400300220011",
    };
    const policyId = lucid.utils.mintingPolicyToId(mintingPolicy);
    const tokenName = utf8ToHex(orderInfo.order_id);
    const unit: Unit = policyId + tokenName;
    //const addr : string = lucid.utils.getAddressDetails(nftAddress.address).address.bech32
    const now = new Date();

    const orderDetails : Json = {
      "version": "1.0",
      "order_id":  orderInfo.order_id,
      "date": now, 
      "ada_amount": orderInfo.ada_amount
    };

    const lovelaceAmount = orderInfo.ada_amount * 1000000

    const mintRedeemer = Data.to(new Constr(0, [new Constr(1, []),BigInt(0),BigInt(0)]));
    //const mintRedeemer = Data.to(new Constr(0, [new Constr(1, []),orderInfo.order_id, BigInt(lovelaceAmount)]));
/*
    const metaData : Json = {
      "order_details" : orderDetails,
      "signature" : signature
    }
*/

/*
    const tx = await lucid
      .newTx()
      .mintAssets({ [unit]: BigInt(1) })
      .validTo(Date.now() + 100000)
      .attachMintingPolicy(mintingPolicy)
      .attachMetadata(1, metaData)
      .complete();
*/
    const merchantAddress = "addr_test1vq7k907l7e59t52skm8e0ezsnmmc7h4xy30kg2klwc5n8rqug2pds";  
    const merchantAmount = lovelaceAmount * 95 / 100
    const donorAddress = "addr_test1vzetpfww4aaunft0ucvcrxugj8nt4lhltsktya0rx0uh48cqghjfg";
    const donorAmount = lovelaceAmount * 5 / 100

    console.log("merchantAmount", merchantAmount.toFixed(0));
    console.log("donorAmount", donorAmount.toFixed(0));

    const tx = await lucid
    .newTx()
    .mintAssets({ [unit]: BigInt(1) }, mintRedeemer)
    .attachMintingPolicy(mintingPolicy)
    .payToAddress(merchantAddress, { ["lovelace"] : BigInt(merchantAmount.toFixed(0)) }) 
    .payToAddress(donorAddress, { ["lovelace"] : BigInt(donorAmount.toFixed(0)) })
    .complete();

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

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
  SpendingValidator,
  TxHash, 
  utf8ToHex,
  } from "lucid-cardano"; // NPM

  
  export async function getServerSideProps(context) {
  
    // set in env variables
    const orderId = (parseInt(context.query.id) || 0).toString();
    const shop = process.env.SHOP as string;
    const token = process.env.ACCESS_TOKEN as string;
    const uri = "admin/api/2022-10/orders/";
    const url = shop + uri + orderId + ".json";
    const serviceFee = 500000  // in lovelace
    const serviceFeeAda = serviceFee / 1000000   // in Ada
    
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
        const adaAmount = (orderData.order.total_price / adaPrice) + serviceFeeAda + 1.25; // adding 1.25 Ada to include tx fees
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

  const earthtrustValidatorScript: SpendingValidator = {
    type: "PlutusV2",
    script: "590df3590df0010000332323232332232323232323232323233223232332232323232323232323232323232323322323232323232322323232323223232323223232232325335323232323232325335003215335533533301a3302e303d3500622220015035335031335503302a335031335503302a0015032503235500222222222222200a1041133573892010445545635000401533553353301b335031335503302a335031335503302a337000026a00c4444004a064a0646aa0044444444444440182082266ae7124104455456360004015335330275002350082222200110411335738921044554563700040104010401533553353330193302d303c35007222220035034335030335503202933503033550320293370666e094011401920c8015031503135500122222222222200a10401335738920104455456310003f1533553353330193302d303c35007222220025034335030335503202933503033550320293370666e094010cdc0a419002a00c906400a818a8189aa8009111111111110050820099ab9c49104455456320003f1533553353301a3350303355032029335030335503202950045031503135500122222222222200c1040133573892104455456330003f1533533026500135007222220011040133573892104455456340003f103f103f103f135001220023333573466e1cd55cea803a4000466442466002006004646464646464646464646464646666ae68cdc39aab9d500c480008cccccccccccc88888888888848cccccccccccc00403403002c02802402001c01801401000c008cd40dc0e0d5d0a80619a81b81c1aba1500b33503703935742a014666aa078eb940ecd5d0a804999aa81e3ae503b35742a01066a06e08c6ae85401cccd540f011dd69aba150063232323333573466e1cd55cea801240004664424660020060046464646666ae68cdc39aab9d5002480008cc8848cc00400c008cd4149d69aba150023053357426ae8940088c98c815ccd5ce02c02b82a89aab9e5001137540026ae854008c8c8c8cccd5cd19b8735573aa004900011991091980080180119a8293ad35742a00460a66ae84d5d1280111931902b99ab9c058057055135573ca00226ea8004d5d09aba250022326320533357380a80a60a226aae7940044dd50009aba1500533503775c6ae854010ccd540f010c8004d5d0a801999aa81e3ae200135742a004608a6ae84d5d1280111931902799ab9c05004f04d135744a00226ae8940044d5d1280089aba25001135744a00226ae8940044d5d1280089aba25001135744a00226ae8940044d55cf280089baa00135742a00e606a6ae84d5d1280391931902099ab9c04204103f3333573466e1d402120022321223002003375a6ae84d55cf280511999ab9a3370ea0129000109100091931902099ab9c04204103f03e13500122220043333573466e1cd55cea8062400046666444424666600200a0080060046eb4d5d0a8061bae35742a0166eb4d5d0a8051bae357426ae8940288c98c80f8cd5ce01f81f01e09a800911110021999ab9a3370e6aae7540412000233333222221233333001006005004003002375a6ae854040dd69aba1500f375c6ae854038dd71aba1500d375c6ae84d5d1280691931901e19ab9c03d03c03a103b13263203b335738921035054350003b135573ca00226ea80044d55cea80089baa001135744a00226ae8940044d55cf280089baa001135744a00226ae8940044d5d1280089aab9e500113754002640026aa0564444a66a0022054442a66aa66a646a002446a010446466a00a466a0084a66a666ae68cdc780100081a81a0a801881a101a119a802101a1299a999ab9a3371e00400206a0682a00620682a66a00642a66a0044266a004466a004466a004466a004466036004002406e466a004406e46603600400244406e44466a008406e444a66a666ae68cdc380300181d01c8a99a999ab9a3370e00a00407407226602c0080022072207220642a66a0024206420646a004444400826660140126a00444440060082058205a266600c00a008002640026aa054444a66a0022050442a66a6600c00866a0366a00444002a038205626600a008002640026aa052444a66a002204e442a66a66600e00c6a0044444006008205426600a00800244666ae68cdc3801000813012911199aa9806890009a805a80511a80091199aa9808090009a807280691a80091199a800919805240000024466016004002466014002900000099aa98040900091a8009119aa80d801199a800919aa98060900091a8009119aa80f8011aa80700080091199aaa804807001000919aa98060900091a8009119aa80f8011aa806800800999aaa802004801000888911199aa980209000a80a99aa98038900091a8009119aa80d0011aa804800999aa980209000911a80111299a999aa9808090009919a80911199a801910010010009a80091000891980091299a8010816080081491a80091198050010028030801899a80c802001a80b00099aa98038900091a800911919aa80d8019800802990009aa81611299a80089aa8050019109a80111299a99806001004089111980100500209803001801190009aa8129108911299a800880111099802801199aa9803890008028020008890911180180208909111800802190009aa811110891299a8008a80991099a80a180200119aa98030900080200091199ab9a3371e00400203e03c2246600244a66a0042002203c03a2466a00844666a006440040040026a00244002446a004444444444444a66a666aa601e2400266a02044a66a004420062002a0384a66a666ae68cdc780700081481409a80f0008a80e802108148813990009aa80e9108911299a80089a80191000910999a802910011802001199aa98038900080280200089109198008018012441001232230023758002640026aa036446666aae7c0049402c8cd4028c010d5d080118019aba200201b232323333573466e1cd55cea8012400046644246600200600460206ae854008c014d5d09aba2500223263201b33573803803603226aae7940044dd50009191919191999ab9a3370e6aae75401120002333322221233330010050040030023232323333573466e1cd55cea8012400046601660326ae854008cd4044060d5d09aba2500223263202033573804204003c26aae7940044dd50009aba150043335500975ca0106ae85400cc8c8c8cccd5cd19b875001480108c84888c008010d5d09aab9e500323333573466e1d4009200223212223001004375c6ae84d55cf280211999ab9a3370ea00690001091100191931901119ab9c02302202001f01e135573aa00226ea8004d5d0a80119a806bae357426ae8940088c98c8070cd5ce00e80e00d09aba25001135744a00226aae7940044dd5000910919800801801099aa800bae75a224464460046eac004c8004d5405c88c8cccd55cf80112804119a80399aa80498031aab9d5002300535573ca00460086ae8800c0604d5d08008891001091091198008020018891091980080180109119191999ab9a3370ea002900011a80398029aba135573ca00646666ae68cdc3a801240044a00e464c6402a66ae7005805404c0484d55cea80089baa0011212230020031122001232323333573466e1d400520062321222230040053007357426aae79400c8cccd5cd19b875002480108c848888c008014c024d5d09aab9e500423333573466e1d400d20022321222230010053007357426aae7940148cccd5cd19b875004480008c848888c00c014dd71aba135573ca00c464c6402666ae7005004c04404003c0384d55cea80089baa001232323333573466e1cd55cea80124000466442466002006004600a6ae854008dd69aba135744a004464c6401e66ae7004003c0344d55cf280089baa0012323333573466e1cd55cea800a400046eb8d5d09aab9e500223263200d33573801c01a01626ea80048c8c8c8c8c8cccd5cd19b8750014803084888888800c8cccd5cd19b875002480288488888880108cccd5cd19b875003480208cc8848888888cc004024020dd71aba15005375a6ae84d5d1280291999ab9a3370ea00890031199109111111198010048041bae35742a00e6eb8d5d09aba2500723333573466e1d40152004233221222222233006009008300c35742a0126eb8d5d09aba2500923333573466e1d40192002232122222223007008300d357426aae79402c8cccd5cd19b875007480008c848888888c014020c038d5d09aab9e500c23263201633573802e02c02802602402202001e01c26aae7540104d55cf280189aab9e5002135573ca00226ea80048c8c8c8c8cccd5cd19b875001480088ccc888488ccc00401401000cdd69aba15004375a6ae85400cdd69aba135744a00646666ae68cdc3a80124000464244600400660106ae84d55cf280311931900799ab9c01000f00d00c135573aa00626ae8940044d55cf280089baa001232323333573466e1d400520022321223001003375c6ae84d55cf280191999ab9a3370ea0049000118031bae357426aae7940108c98c8030cd5ce00680600500489aab9d5001137540024244600400624464646666ae68cdc3a800a40084244400246666ae68cdc3a8012400446424446006008600c6ae84d55cf280211999ab9a3370ea00690001091100111931900619ab9c00d00c00a009008135573aa00226ea80048c8cccd5cd19b8750014800880148cccd5cd19b8750024800080148c98c8020cd5ce00480400300289aab9d37540022440042440029309000a4810350543100112323001001223300330020020014c161d8799f01185f581c3d62bfdff66855d150b6cf97e4509ef78f5ea6245f642adf7629338c581cb2b0a5ceaf7bc9a56fe619819b8891e6bafeff5c2cb275e333f97a9f581cb9abcf6867519e28042048aa11207214a52e6d5d3288b752d1c27682ff0001",
  };

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
    const serviceFee = 500000  // in lovelace
    const api_key : string = "preprodxg6GaNVZoHWUfQd7HQcgUg8epWhE1aMi";
    const lucid = await Lucid.new(
      new Blockfrost("https://cardano-preprod.blockfrost.io/api/v0", api_key),
      "Preprod",
    );

    const earthtrustValidatorAddress = "addr_test1wp98u3s8wjrfxpjlerzlw2wg9a6k5ws8cc25gadtcxfe7xs6g8lm9";

    // ----------------------------------------------------------------------

    lucid.selectWallet(API);

    //const earthtrustValidatorAddress: Address = lucid.utils.validatorToAddress(
    //  earthtrustValidatorScript,
    //);


    const { paymentCredential, address } = lucid.utils.getAddressDetails(
      await lucid.wallet.address(),
    );
    const refundPkh = paymentCredential?.hash as string;
    const refundAddr = address.bech32;
    const lovelaceAmount = (orderInfo.ada_amount) * 1000000

    console.log("paymentCredential", paymentCredential);
    console.log("refundPkh", refundPkh);
    console.log("refundAddr", refundAddr);
    
 
    /*
     Datum {
      order_amount : int
      order_info : string
     }
    */

    const newDatum = Data.to(new Constr(0, [BigInt(lovelaceAmount - serviceFee), 
                                            utf8ToHex(orderInfo.order_id)]));

    const tx = await lucid
      .newTx()
      .payToContract(earthtrustValidatorAddress, { inline: newDatum }, { ["lovelace"] : BigInt(lovelaceAmount) })
      .complete();

    const signedTx = await tx.sign().complete();

    const txHash = await signedTx.submit();
    console.log("txHash", txHash);
    setTx({ txId: txHash });
    //setTxStatus({txStatus : "SUBMITTED"});
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

    </main>

    <footer className={styles.footer}>

    </footer>
  </div>
    
  )
}

export default Home

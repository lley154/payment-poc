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
        "5909c05909bd010000332323322323232332232323232323232323232323232323322323232323232323232322335502322323232232325335330083333573466e1cd55cea80324000466644424666002008006004603c6ae854018dd69aba15005375a6ae84d5d1280291931901019ab9c02102001e3333573466e1cd55cea80124000466442466002006004646464646464646464646464646666ae68cdc39aab9d500c480008cccccccccccc88888888888848cccccccccccc00403403002c02802402001c01801401000c008cd4074078d5d0a80619a80e80f1aba1500b33501d01f35742a014666aa042eb94080d5d0a804999aa810bae502035742a01066a03a0506ae85401cccd540840a5d69aba150063232323333573466e1cd55cea801240004664424660020060046464646666ae68cdc39aab9d5002480008cc8848cc00400c008cd40cdd69aba150023034357426ae8940088c98c80d8cd5ce01b81b01a09aab9e5001137540026ae854008c8c8c8cccd5cd19b8735573aa004900011991091980080180119a819bad35742a00460686ae84d5d1280111931901b19ab9c037036034135573ca00226ea8004d5d09aba2500223263203233573806606406026aae7940044dd50009aba1500533501d75c6ae854010ccd540840948004d5d0a801999aa810bae200135742a004604e6ae84d5d1280111931901719ab9c02f02e02c135744a00226ae8940044d5d1280089aba25001135744a00226ae8940044d5d1280089aba25001135744a00226ae8940044d55cf280089baa00135742a004602e6ae84d5d1280111931901019ab9c02102001e101f13263201f335738921035054350001f135573ca00226ea80044d5d1280089aab9e50011375400244646a006444a66a006266048660149201054e46545031005335301f3009500410272213500222253350041330293332001502a002301000c3332001502b001480088840b8cc029241054e4654503200335502932235002222222222222533533355301612001321233001225335002210031001002502025335333573466e3c0380040dc0d84d408800454084010840dc40d54010c8004d401c880044cc029241054e46545033005335301f3009500410272213500222253350041330293332001502a002301000c3332001502b001480048840b84d400488008c8004d5408888448894cd40044d400c88004884ccd401488008c010008ccd54c01c480040140100048d4004888888888888020894cd400440804cd5ce00100f91a800910010919118011bac0013200135501f2233335573e0024a036466a03460086ae84008c00cd5d100100a119191999ab9a3370e6aae7540092000233221233001003002300c35742a004600a6ae84d5d1280111931900a19ab9c015014012135573ca00226ea80048c8c8c8c8cccd5cd19b8735573aa00890001199991110919998008028020018011919191999ab9a3370e6aae7540092000233221233001003002301535742a00466a01a0286ae84d5d1280111931900c99ab9c01a019017135573ca00226ea8004d5d0a802199aa8043ae500735742a0066464646666ae68cdc3a800a4008464244460040086ae84d55cf280191999ab9a3370ea0049001119091118008021bae357426aae7940108cccd5cd19b875003480008488800c8c98c806ccd5ce00e00d80c80c00b89aab9d5001137540026ae854008cd4025d71aba135744a004464c6402a66ae7005805404c4d5d1280089aba25001135573ca00226ea80044cd54005d73ad112232230023756002640026aa03844646666aae7c008940648cd4060cc8848cc00400c008c018d55cea80118029aab9e500230043574400602426ae84004488c8c8cccd5cd19b875001480008d401cc014d5d09aab9e500323333573466e1d400920022500723263201233573802602402001e26aae7540044dd50008909118010018891000919191999ab9a3370ea002900311909111180200298039aba135573ca00646666ae68cdc3a8012400846424444600400a60126ae84d55cf280211999ab9a3370ea006900111909111180080298039aba135573ca00a46666ae68cdc3a8022400046424444600600a6eb8d5d09aab9e500623263201033573802202001c01a01801626aae7540044dd5000919191999ab9a3370e6aae7540092000233221233001003002300535742a0046eb4d5d09aba2500223263200c33573801a01801426aae7940044dd50009191999ab9a3370e6aae75400520002375c6ae84d55cf280111931900519ab9c00b00a00813754002464646464646666ae68cdc3a800a401842444444400646666ae68cdc3a8012401442444444400846666ae68cdc3a801a40104664424444444660020120106eb8d5d0a8029bad357426ae8940148cccd5cd19b875004480188cc8848888888cc008024020dd71aba15007375c6ae84d5d1280391999ab9a3370ea00a900211991091111111980300480418061aba15009375c6ae84d5d1280491999ab9a3370ea00c900111909111111180380418069aba135573ca01646666ae68cdc3a803a400046424444444600a010601c6ae84d55cf280611931900999ab9c01401301101000f00e00d00c00b135573aa00826aae79400c4d55cf280109aab9e5001137540024646464646666ae68cdc3a800a4004466644424466600200a0080066eb4d5d0a8021bad35742a0066eb4d5d09aba2500323333573466e1d4009200023212230020033008357426aae7940188c98c8030cd5ce00680600500489aab9d5003135744a00226aae7940044dd5000919191999ab9a3370ea002900111909118008019bae357426aae79400c8cccd5cd19b875002480008c8488c00800cdd71aba135573ca008464c6401266ae7002802401c0184d55cea80089baa00112232323333573466e1d400520042122200123333573466e1d40092002232122230030043006357426aae7940108cccd5cd19b87500348000848880088c98c8028cd5ce00580500400380309aab9d5001137540024646666ae68cdc3a800a4004402046666ae68cdc3a801240004020464c6400c66ae7001c01801000c4d55ce9baa00149848005241035054310023300250050013200135500a222533500110022213500222330073330080020060010033200135500922225335001100222135002225335333573466e1c005200000f00e133300800700600313330080073350091233300100800300200600311220021221223300100400322533500210011005122333573466e3c008004014010488ccd5cd19b8700200100400312200212200111223002001112323001001223300330020020013351223300248811c4c6974746572636f696e20417070726f766564204d65726368616e740048811cb9abcf6867519e28042048aa11207214a52e6d5d3288b752d1c276820022123300100300220011",
    };
    const policyId = lucid.utils.mintingPolicyToId(mintingPolicy);
    const name: string = "Littercoin Approved Merchant";
    const unit: Unit = policyId + utf8ToHex(name);
    //const addr : string = lucid.utils.getAddressDetails(nftAddress.address).address.bech32
    const qty = BigInt(1);  // only 1 NFT token
    const adminAddr = await lucid.wallet.address();
    const mintRedeemer = Data.to(new Constr(0, [new Constr(1, []),BigInt(0),BigInt(0)]));

    const tx = await lucid
      .newTx()
      .mintAssets({ [unit]: qty }, mintRedeemer)
      .attachMintingPolicy(mintingPolicy)
      .addSigner(adminAddr)
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

import type { NextPage } from 'next'
import Head from 'next/head'
import styles from '../styles/Home.module.css'
import { useState, useEffect } from "react";
import BuyProduct from '../components/BuyProduct';
import AddScript from '../components/AddScript';

import { 
  Address,
  Blockfrost, 
  C, 
  Constr,
  Data,
  Json, 
  Lucid,
  SpendingValidator,
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

    const earthtrustValidatorScript: SpendingValidator = {
      type: "PlutusV2",
      script: "590cf7590cf401000033232323233223232323232323232323322323233223232323232323232323232323233223232323232323223232323232232223232533532323232323232533553353330143302730363500722222003502e33502a335502c02333502a335502c0233370666e094011401920c801502b502b35500122222222222200a103a13357389210445545631000391533553353330143302730363500722222002502e33502a335502c02333502a335502c0233370666e094010cdc0a419002a00c906400a815a8159aa800911111111111005081d099ab9c491044554563200039153355335323235002222222222222533533355302c12001335030225335002210031001503c25335333573466e3c0380041241204d40f8004540f401084124411cd402088888005400440e84cd5ce249044554563300039153353301533502a335502c02333502a335502c0235004502b502b35500122222222222200c103a1335738921044554563400039103910391039135001220023333573466e1cd55cea803a4000466442466002006004646464646464646464646464646666ae68cdc39aab9d500c480008cccccccccccc88888888888848cccccccccccc00403403002c02802402001c01801401000c008cd40c40c8d5d0a80619a8188191aba1500b33503103335742a014666aa06ceb940d4d5d0a804999aa81b3ae503535742a01066a0620806ae85401cccd540d8105d69aba150063232323333573466e1cd55cea801240004664424660020060046464646666ae68cdc39aab9d5002480008cc8848cc00400c008cd4131d69aba15002304d357426ae8940088c98c8144cd5ce02902882789aab9e5001137540026ae854008c8c8c8cccd5cd19b8735573aa004900011991091980080180119a8263ad35742a004609a6ae84d5d1280111931902899ab9c05205104f135573ca00226ea8004d5d09aba2500223263204d33573809c09a09626aae7940044dd50009aba1500533503175c6ae854010ccd540d80f48004d5d0a801999aa81b3ae200135742a004607e6ae84d5d1280111931902499ab9c04a049047135744a00226ae8940044d5d1280089aba25001135744a00226ae8940044d5d1280089aba25001135744a00226ae8940044d55cf280089baa00135742a00e605e6ae84d5d1280391931901d99ab9c03c03b0393333573466e1cd55ce9baa0084800080e88c98c80e8cd5ce01d81d01c09a80090009999ab9a3370e6aae75401d2000232123001002375a6ae84d55cf280411931901c19ab9c039038036135001222220043333573466e1cd55cea805a400046666644444246666600200c00a0080060046eb4d5d0a8059bad35742a0146eb8d5d0a8049bae35742a0106eb8d5d09aba2500823263203633573806e06c068206a264c6406a66ae712410350543500035135573ca00226ea80044dd500089aba25001135744a00226ae8940044d55cf280089baa0013200135502a22225335001102922153355335323500122350082232335005233500425335333573466e3c0080040d00cc5400c40cc80cc8cd401080cc94cd4ccd5cd19b8f002001034033150031033153350032153350022133500223350022335002233500223301c00200120362335002203623301c00200122203622233500420362225335333573466e1c01800c0e40e054cd4ccd5cd19b8700500203903813301600400110381038103115335001210311031350022222004133300a009350022222003004102b102c1333006005004001320013550292225335001102722153353300600433501a3500222001501b102a13300500400132001355028222533500110262215335333007006350022222003004102913300500400122333573466e1c008004094090888ccd54c02448004d4031402c8d400488ccd54c03048004d403d40388d400488ccd40048cc0292000001223300b00200123300a00148000004cd54c020480048d400488cd54068008ccd40048cd54c030480048d400488cd54078008d5403800400488ccd55402403c0080048cd54c030480048d400488cd54078008d54034004004ccd554010028008004444888ccd54c010480054050cd54c01c480048d400488cd54064008d54024004ccd54c0104800488d4008894cd4ccd54c03048004c8cd404488ccd400c88008008004d40048800448cc004894cd400840ac40040a08d400488cc028008014018400c4cd406001000d4054004cd54c01c480048d400488c8cd5406800cc004014c8004d540ac894cd40044d5402800c884d4008894cd4cc03000802044888cc0080280104c01800c008c8004d5409088448894cd40044008884cc014008ccd54c01c480040140100044484888c00c0104484888c004010c8004d540848844894cd400454048884cd404cc010008cd54c01848004010004c8004d5408088448894cd40044d400c88004884ccd401488008c010008ccd54c01c4800401401000488ccd5cd19b8f00200101d01c112330012253350021001101c01b1233500222333500322002002001350012200112212330010030024881001232230023758002640026aa036446666aae7c0049402c8cd4028c010d5d080118019aba200201b232323333573466e1cd55cea8012400046644246600200600460206ae854008c014d5d09aba2500223263201b33573803803603226aae7940044dd50009191919191999ab9a3370e6aae75401120002333322221233330010050040030023232323333573466e1cd55cea8012400046601660326ae854008cd4044060d5d09aba2500223263202033573804204003c26aae7940044dd50009aba150043335500975ca0106ae85400cc8c8c8cccd5cd19b875001480108c84888c008010d5d09aab9e500323333573466e1d4009200223212223001004375c6ae84d55cf280211999ab9a3370ea00690001091100191931901119ab9c02302202001f01e135573aa00226ea8004d5d0a80119a806bae357426ae8940088c98c8070cd5ce00e80e00d09aba25001135744a00226aae7940044dd5000910919800801801099aa800bae75a224464460046eac004c8004d5405c88c8cccd55cf80112804119a80399aa80498031aab9d5002300535573ca00460086ae8800c0604d5d08008891001091091198008020018891091980080180109119191999ab9a3370ea002900011a80398029aba135573ca00646666ae68cdc3a801240044a00e464c6402a66ae7005805404c0484d55cea80089baa0011212230020031122001232323333573466e1d400520062321222230040053007357426aae79400c8cccd5cd19b875002480108c848888c008014c024d5d09aab9e500423333573466e1d400d20022321222230010053007357426aae7940148cccd5cd19b875004480008c848888c00c014dd71aba135573ca00c464c6402666ae7005004c04404003c0384d55cea80089baa001232323333573466e1cd55cea80124000466442466002006004600a6ae854008dd69aba135744a004464c6401e66ae7004003c0344d55cf280089baa0012323333573466e1cd55cea800a400046eb8d5d09aab9e500223263200d33573801c01a01626ea80048c8c8c8c8c8cccd5cd19b8750014803084888888800c8cccd5cd19b875002480288488888880108cccd5cd19b875003480208cc8848888888cc004024020dd71aba15005375a6ae84d5d1280291999ab9a3370ea00890031199109111111198010048041bae35742a00e6eb8d5d09aba2500723333573466e1d40152004233221222222233006009008300c35742a0126eb8d5d09aba2500923333573466e1d40192002232122222223007008300d357426aae79402c8cccd5cd19b875007480008c848888888c014020c038d5d09aab9e500c23263201633573802e02c02802602402202001e01c26aae7540104d55cf280189aab9e5002135573ca00226ea80048c8c8c8c8cccd5cd19b875001480088ccc888488ccc00401401000cdd69aba15004375a6ae85400cdd69aba135744a00646666ae68cdc3a80124000464244600400660106ae84d55cf280311931900799ab9c01000f00d00c135573aa00626ae8940044d55cf280089baa001232323333573466e1d400520022321223001003375c6ae84d55cf280191999ab9a3370ea0049000118031bae357426aae7940108c98c8030cd5ce00680600500489aab9d5001137540024244600400624464646666ae68cdc3a800a40084244400246666ae68cdc3a8012400446424446006008600c6ae84d55cf280211999ab9a3370ea00690001091100111931900619ab9c00d00c00a009008135573aa00226ea80048c8cccd5cd19b8750014800880148cccd5cd19b8750024800080148c98c8020cd5ce00480400300289aab9d37540022440042440029309000a4810350543100112323001001223300330020020014c161d8799f01185f581c3d62bfdff66855d150b6cf97e4509ef78f5ea6245f642adf7629338c581cb2b0a5ceaf7bc9a56fe619819b8891e6bafeff5c2cb275e333f97a9f581cb9abcf6867519e28042048aa11207214a52e6d5d3288b752d1c27682ff0001",
    };

    // ----------------------------------------------------------------------
    // Move these to env variables
    // ----------------------------------------------------------------------
    const api_key : string = "preprodxg6GaNVZoHWUfQd7HQcgUg8epWhE1aMi";
    const lucid = await Lucid.new(
      new Blockfrost("https://cardano-preprod.blockfrost.io/api/v0", api_key),
      "Preprod",
    );
    // ----------------------------------------------------------------------

    lucid.selectWallet(API);

    const earthtrustValidatorAddress: Address = lucid.utils.validatorToAddress(
      earthtrustValidatorScript,
    );
    
    const adaAmount = 100000000;
    const Redeemer = () => Data.empty();
    const Datum = () => Data.empty();
    const newDatum = Data.to(new Constr(0, [BigInt(adaAmount)]));


    const tx = await lucid
    .newTx()
    .payToContract(earthtrustValidatorAddress, { inline: newDatum }, { ["lovelace"] : BigInt(adaAmount) })
    .payToContract(earthtrustValidatorAddress, {
      asHash: Datum(),
      scriptRef: earthtrustValidatorScript, // adding plutusV2 script to output
    }, {})
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

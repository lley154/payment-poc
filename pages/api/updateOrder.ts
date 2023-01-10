import type { NextApiRequest, NextApiResponse } from 'next'


export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse ) {
  if (req.method == 'POST') {
    
    // TODO check if security token is passed to lock down this api
    
    const updateOrderInfo = req.body.updateOrderInfo;
    const uri = "admin/api/2022-10/orders/";
    const url : string = updateOrderInfo.shop + uri + updateOrderInfo.order_id + ".json";
    const ada_amount : string = updateOrderInfo.ada_amount;
    const ada_usd_price : string = updateOrderInfo.ada_usd_price;
    const note_ada =  "Ada Amount = " + ada_amount;
    const note_ada_usd = " | Ada/USD Price = " + ada_usd_price;
    const txId : string = updateOrderInfo.tx_id;
    const notes = note_ada + note_ada_usd + " | txId = " + txId;
    const orderId : string = updateOrderInfo.order_id;
    const accessToken : string = updateOrderInfo.access_token;

    const order_update = { 
        order : {
          id : orderId,
          tags : "TX SUBMITTED",
          note : notes
        }
      }
    
    const shopifyReq = await fetch(url, {
      body : JSON.stringify(order_update),
      headers: {
        'Access-Control-Allow-Origin': '*',
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
                 
      },
      method: 'PUT'
    });

    const updateStatus = await shopifyReq.json();
    res.status(200).json(updateStatus);
  }
  else {
    res.status(400);
  }

}






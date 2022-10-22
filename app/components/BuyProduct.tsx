import { useState } from 'react'
//import styles from '../styles/Home.module.css'

const BuyProduct = ({ onBuyProduct, orderData } : any) => {

    const onSubmit = (e : any) => {
        
        e.preventDefault() // prevent full page refresh
        onBuyProduct(qty)
    }
    

    return (

        <form onSubmit={onSubmit}>
            <div>
                <p><b>Buy Product </b></p>
                <p>Order ID &nbsp; &nbsp;{orderData.orderId}</p>
                <p>Price &nbsp; &nbsp;${orderData.total_price}</p>

                <input name='qty' type='number' id='qty' placeholder='Buy Product'
                />
            </div>
            <br/>
            <input type='submit' value='Buy Product'/>
        </form>

    )
}

export default BuyProduct
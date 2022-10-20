import { useState } from 'react'
//import styles from '../styles/Home.module.css'

const BuyProduct = ({ onBuyProduct } : any) => {

    const [qty, setQty] = useState('')

    const onSubmit = (e : any) => {
        
        e.preventDefault() // prevent full page refresh
        onBuyProduct(qty)
    }
    

    return (

        <form onSubmit={onSubmit}>
            <div>
                <b>Buy Product</b>
                <br></br>
                <input name='qty' type='number' id='qty' placeholder='Buy Product' 
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                />
            </div>
            <br/>                      
            <input type='submit' value='Buy Product'/>
        </form>
    )
}

export default BuyProduct
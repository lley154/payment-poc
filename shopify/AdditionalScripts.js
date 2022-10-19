<script>
    Shopify.Checkout.OrderStatus.addContentBox(
    '<h2 style="color:red;">Pay To Complete Your Order</h2>',
    '<form id="payForm" action="http://localhost:3000" method="post"><input type="hidden" id="orderId" name="id" value="" /><input type="submit" name="submit" value="Pay Now In Ada" onclick="submitPayment()" /></form>'
    )
console.log("Shopify.checkout.order_id", Shopify.checkout.order_id);   
function submitPayment() {
     document.getElementById('orderId').value = Shopify.checkout.order_id;
     document.getElementById("payForm").submit();
   }
</script>

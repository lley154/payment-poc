<script>
    Shopify.Checkout.OrderStatus.addContentBox(
    '<h2 style="color:red;">Pay To Complete Your Order</h2>',
    '<a href="#" id="paynow">Pay Now In Ada</a>'
    );
    var urlStr = "http://localhost:3000";
    var url = new URL(urlStr);
    var params = url.searchParams;
    params.append("id", Shopify.checkout.order_id);

    function updatePayNow () {
      document.getElementById("paynow").href=url
    }

    document.addEventListener("DOMContentLoaded", function() {
      updatePayNow()
    });

</script>
namespace Altinn.App.Core.Features.Payment.Processors.Nets.Models;

/// <summary>
/// Initializes a new payment object that becomes the object used throughout the checkout flow for a particular customer and order. Creating a payment object is the first step when you intend to accept a payment from your customer. Entering the amount 100 corresponds to 1 unit of the currency entered, such as e.g. 1 NOK. Typically you provide the following information:
/// The order details including order items, total amount, and currency.
/// Checkout page settings, which specify what type of integration you want: a checkout page embedded on your site or a pre-built checkout page hosted by Nexi Group. You can also specify data about your customer so that your customer only needs to provide payment details on the checkout page.
///
/// Optionally, you can also provide information regarding:
/// Notifications if you want to be notified through webhooks when the status of the payment changes.
/// Fees added when using payment methods such as invoice.
/// Charge set to true so you can enable autocapture for subscriptions.
///
/// On success, this method returns a paymentId that can be used in subsequent requests to refer to the newly created payment object. Optionally, the response object will also contain a hostedPaymentPageUrl, which is the URL you should redirect to if using a hosted pre-built checkout page.
/// </summary>
internal class NetsCreatePayment
{
    /// <summary>
    /// Specifies an order associated with a payment. An order must contain at least one order item. The amount of the order must match the sum of the specified order items.
    /// </summary>
    public required NetsOrder Order { get; set; }

    /// <summary>
    /// Defines the behavior and style of the checkout page.
    /// </summary>
    public required NetsCheckout Checkout { get; set; }

    /// <summary>
    /// The merchant number. Use this header only if you are a Nexi Group partner and initiating the checkout with your partner keys. If you are using the integration keys for your webshop, there is no need to specify this header.
    /// Length: 0-128
    /// The following special characters are not supported: &lt;,&gt;,\,’,”,&amp;,\\
    /// </summary>
    public string? MerchantNumber { get; set; }

    /// <summary>
    /// Notifications allow you to subscribe to status updates for a payment.
    /// </summary>
    public NetsNotifications? Notifications { get; set; }

    /// <summary>
    /// Specifies payment methods configuration to be used for this payment, ignored if empty or null.
    /// </summary>
    public List<NetsPaymentMethodConfiguration>? PaymentMethodsConfiguration { get; set; }

    /// <summary>
    /// Optional (seems useless with current documentation)
    /// </summary>
    public List<NetsPaymentMethod>? PaymentMethods { get; set; }

    /// <summary>
    /// Merchant payment reference
    /// Length: 0-36
    /// The following special characters are not supported: &lt;,&gt;,\,’,”,&amp;,\\
    /// </summary>
    public required string MyReference { get; set; }
}

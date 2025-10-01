namespace Altinn.App.Core.Features.Payment.Processors.Nets.Models;

/// <summary>
/// Defines the behavior and style of the checkout page.
/// </summary>
internal class NetsCheckout
{
    /// <summary>
    /// Specifies where the checkout will be loaded if using an embedded checkout page. See also the integrationType property.
    /// Length: 0-256
    /// Allowed: &amp;
    /// The following special characters are not supported: &lt;,&gt;,\,’,”,&amp;,\\
    /// Additional notes: HTTPS is not required
    /// </summary>
    public string? Url { get; set; }

    /// <summary>
    /// Determines whether the checkout should be embedded in your webshop or if the checkout
    /// should be hosted by Nexi Group on a separate page.
    /// Valid values are:
    /// 'EmbeddedCheckout' (default) or 'HostedPaymentPage'.
    /// Please note that the string values are case sensitive. If set to 'HostedPaymentPage',
    /// your website should redirect the customer to the hostedPaymentPageUrl provided in the
    /// response body. Using a hosted checkout page requires that you specify the returnUrl
    /// property. If set to 'EmbeddedCheckout', the checkout page will be embedded within an
    /// iframe on your website using the Checkout JS SDK. Using an embedded checkout page requires
    /// that you also specify the url property.
    /// </summary>
    /// <remarks>Listed as optional in API doc, but seems strange to depend on default value</remarks>
    public required string IntegrationType { get; set; }

    /// <summary>
    /// Specifies where your customer will return after a completed payment when using a hosted checkout page. See also the <see cref="IntegrationType"/> property.
    /// </summary>
    public string? ReturnUrl { get; set; }

    /// <summary>
    /// Specifies where your customer will return after a canceled payment when using a hosted checkout page. See also the <see cref="IntegrationType"/> property.
    /// </summary>
    public string? CancelUrl { get; set; }

    /// <summary>
    /// Contains information about the customer. If provided, this information will be used for initating the consumer data of the payment object.
    /// See also the property merchantHandlesConsumerData which controls what fields to show on the checkout page.
    /// </summary>
    public NetsCheckoutConsumerDetails? Consumer { get; set; }

    /// <summary>
    /// The URL to the terms and conditions of your webshop.
    /// Whitelist: “[&amp;]” =&gt; “”
    /// The following special characters are not supported: &lt;,&gt;,\,’,”,&amp;,\\
    /// Additional notes: HTTPS is not required
    /// </summary>
    public required string TermsUrl { get; set; }

    /// <summary>
    /// The URL to the privacy and cookie settings of your webshop.
    /// Whitelist: “[&amp;]” =&gt; “”
    /// The following special characters are not supported: &lt;,&gt;,\,’,”,&amp;,\\
    /// Additional notes: HTTPS is not required
    /// </summary>
    public string? MerchantTermsUrl { get; set; }

    /// <summary>
    /// An array of countries that limits the set of countries available for shipping. If left unspecified, all countries supported by Easy Checkout will be available for shipping on the checkout page.
    /// </summary>
    public List<NetsShippingCountry>? ShippingCountries { get; set; }

    /// <summary>
    /// Properties related to shipping of packets.
    /// </summary>
    public NetsShipping? Shipping { get; set; }

    /// <summary>
    /// Configures which consumer types should be accepted. Defaults to 'B2C'.These options are ignore if the property merchantHandlesConsumerData is set to true.
    /// </summary>
    public NetsConsumerType? ConsumerType { get; set; }

    /// <summary>
    /// If set to true, the transaction will be charged automatically after the reservation has been accepted. Default value is false if not specified.
    /// </summary>
    public bool? Charge { get; set; }

    /// <summary>
    /// If set to true, the checkout will not load any user data, and also the checkout will not remember the current consumer on this device. Default value is false if not specified.
    /// </summary>
    public bool? PublicDevice { get; set; }

    /// <summary>
    /// Allows you to initiate the checkout with customer data so that your customer only need to provide payment details. It is possible to exclude all consumer and company information from the payment (only for certain payment methods) when it is set to true. If you still want to add consumer information to the payment you need to use the consumer object (either a privatePerson or a company, not both).
    /// </summary>
    public bool? MerchantHandlesConsumerData { get; set; }

    /// <summary>
    /// Defines the appearance of the checkout page.
    /// </summary>
    public NetsApparence? Appearance { get; set; }

    /// <summary>
    /// Merchant's three-letter checkout country code (ISO 3166-1), for example GBR. See also the list of supported languages.
    /// Important: For Klarna payments, the countryCode field is mandatory. If not provided, Klarna will not be available as a payment method.
    /// Length: 3
    /// Pattern: [A-Z]{3}
    /// The following special characters are not supported: &lt;,&gt;,\,’,”,&amp;,\\
    /// </summary>
    public string? CountryCode { get; set; }
}

/// <summary>
/// Defines the appearance of the checkout page.
/// </summary>
internal class NetsApparence
{
    /// <summary>
    /// Controls what is displayed on the checkout page.
    /// </summary>
    public NetsDisplayOptions? DisplayOptions { get; set; }

    /// <summary>
    /// Controls what text is displayed on the checkout page.
    /// </summary>
    public NetsTextOptions? TextOptions { get; set; }

    /// <summary>
    /// Controls what is displayed on the checkout page.
    /// </summary>
    public class NetsDisplayOptions
    {
        /// <summary>
        /// If set to true, displays the merchant name above the checkout. Default value is true when using a HostedPaymentPage.
        /// </summary>
        public bool? ShowMerchantName { get; set; }

        /// <summary>
        /// If set to true, displays the order summary above the checkout. Default value is true when using a HostedPaymentPage.
        /// </summary>
        public bool? ShowOrderSummary { get; set; }
    }

    /// <summary>
    /// Controls what text is displayed on the checkout page.
    /// </summary>
    internal class NetsTextOptions
    {
        /// <summary>
        /// Overrides payment button text. The following predefined values are allowed: pay, purchase, order, book, reserve, signup, storecard, subscribe, accept. The payment button text is localized.
        /// </summary>
        public string? CompletePaymentButtonText { get; set; }
    }
}

/// <summary>
/// Configures which consumer types should be accepted. Defaults to 'B2C'.These options are ignore if the property merchantHandlesConsumerData is set to true.
/// </summary>
internal class NetsConsumerType
{
    /// <summary>
    /// The checkout form defaults to this consumer type when first loaded.
    /// </summary>
    public string? Default { get; set; }

    /// <summary>
    /// The array of consumer types that should be supported on the checkout page. Allowed values are: 'B2B' and 'B2C'.
    /// </summary>
    public List<string>? SupportedTypes { get; set; }
}

/// <summary>
/// Properties related to shipping of packets.
/// </summary>
internal class NetsShipping
{
    /// <summary>
    /// Not documented in API doc why this is duplicated in the shipping object
    /// </summary>
    public List<NetsShippingCountry>? Countries { get; set; }

    /// <summary>
    /// If set to true, the payment order is required to be updated (using the Update order method) with shipping.costSpecified set to true before the customer can complete a purchase. Defaults to false if not specified.
    /// </summary>
    public bool MerchantHandlesShippingCost { get; set; } = false;

    /// <summary>
    /// If set to true, the customer is provided an option to specify separate addresses for billing and shipping on the checkout page. If set to false, the billing address is used as the shipping address.
    /// </summary>
    public bool? EnableBillingAddress { get; set; }
}

/// <summary>
/// An array of countries that limits the set of countries available for shipping. If left unspecified, all countries supported by Easy Checkout will be available for shipping on the checkout page.
/// </summary>
internal class NetsShippingCountry
{
    /// <summary>
    /// A three-letter country code (ISO 3166-1), for example GBR. See also the list of supported countries.
    /// Important: For Klarna payments, the countryCode field is mandatory. If not provided, Klarna will not be available as a payment method.
    /// Length: 3
    /// Pattern: [A-Z]{3}
    /// The following special characters are not supported: &lt;,&gt;,\,’,”,&amp;,\\
    /// </summary>
    public string? CountryCode { get; set; }
}

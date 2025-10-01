namespace Altinn.App.Core.Features.Payment.Processors.Nets;

/// <summary>
/// Represents settings for the Nets payment processor.
/// </summary>
public class NetsPaymentSettings
{
    /// <summary>
    /// Main authentication key for the Nets payment processor. Should be set in the secret manager being used. Never check in to source control.
    /// </summary>
    public required string SecretApiKey { get; set; }

    /// <summary>
    /// Base API url for Nets Easy.
    /// </summary>
    public required string BaseUrl { get; set; }

    /// <summary>
    /// Terms for the payment being made. This link will be shown to the user before they confirm the payment.
    /// </summary>
    public required string TermsUrl { get; set; }

    /// <summary>
    /// If true, a summary of the order will be shown to the user before they confirm the payment.
    /// </summary>
    public bool ShowOrderSummary { get; set; } = true;

    /// <summary>
    /// If true, the name of the merchant will be shown to the user before they confirm the payment.
    /// </summary>
    public bool ShowMerchantName { get; set; } = true;

    /// <summary>
    /// Allows you to initiate the checkout with customer data so that your customer only need to provide payment details. If set to true, information about the paying party must be supplied.
    /// </summary>
    public bool? MerchantHandlesConsumerData { get; set; }

    /// <summary>
    /// This is mapped directly into the Nets Easy PaymentMethodsConfiguration property on the create payment model.
    ///
    /// Specifies payment methods configuration to be used for this payment, ignored if empty or null.
    ///
    /// Name is the name of the payment method or payment type to be configured. If the specified payment method is not configured correctly in the merchant configurations then this won't take effect.
    /// Payment type cannot be specified alongside payment methods that belong to it, if it happens the request will fail with an error.
    ///
    /// Possible payment methods values: "Visa", "MasterCard", "Dankort", "AmericanExpress", "PayPal", "Vipps", "MobilePay", "Swish", "Arvato", "EasyInvoice", "EasyInstallment", "EasyCampaign", "RatePayInvoice", "RatePayInstallment", "RatePaySepa", "Sofort", "Trustly".
    /// Possible payment types values: "Card", "Invoice", "Installment", "A2A", "Wallet".
    ///
    /// Enabled indicates that the specified payment method/type is allowed to be used for this payment, defaults to true. If one or more payment method/type is configured in the parent array then this value will be considered false for any other payment method that the parent array doesn't cover.
    /// </summary>
    public List<PaymentMethodConfigurationItem>? PaymentMethodsConfiguration { get; set; }

    /// <summary>
    /// Represents a payment method setting.
    /// </summary>
    public class PaymentMethodConfigurationItem
    {
        /// <summary>
        /// The name of the payment method or payment type to be configured, if the specified payment method is not configured correctly in the merchant configurations then this won't take effect.
        /// Payment type cannot be specified alongside payment methods that belong to it, if it happens the request will fail with an error.
        /// Possible payment methods values: "Visa", "MasterCard", "Dankort", "AmericanExpress", "PayPal", "Vipps", "MobilePay", "Swish", "Arvato", "EasyInvoice", "EasyInstallment", "EasyCampaign", "RatePayInvoice", "RatePayInstallment", "RatePaySepa", "Sofort", "Trustly".
        /// Possible payment types values: "Card", "Invoice", "Installment", "A2A", "Wallet".
        /// </summary>
        public required string Name { get; set; }

        /// <summary>
        /// Indicates that the specified payment method/type is allowed to be used for this payment, defaults to true.
        /// If one or more payment method/type is configured in the parent array then this value will be considered false for any other payment method that the parent array doesn't cover.
        /// </summary>
        public required bool Enabled { get; set; } = true;
    }
}

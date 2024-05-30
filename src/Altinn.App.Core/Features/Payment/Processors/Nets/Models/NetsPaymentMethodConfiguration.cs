namespace Altinn.App.Core.Features.Payment.Processors.Nets.Models;

/// <summary>
/// Specifies payment methods configuration to be used for this payment, ignored if empty or null.
/// </summary>
internal class NetsPaymentMethodConfiguration
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
    public bool Enabled { get; set; } = true;
}

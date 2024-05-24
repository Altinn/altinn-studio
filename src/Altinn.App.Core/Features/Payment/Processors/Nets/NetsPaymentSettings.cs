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
}

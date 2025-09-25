namespace Altinn.App.Core.Features.Payment.Models;

/// <summary>
/// Represents the details of a payment
/// </summary>
public class PaymentDetails
{
    /// <summary>
    /// The payment reference for the transaction.
    /// </summary>
    public required string PaymentId { get; set; }

    /// <summary>
    /// The redirect URL for the payment. Used to redirect the user to payment processors GUI.
    /// </summary>
    public string? RedirectUrl { get; set; }

    /// <summary>
    /// Person/Company making the payment
    /// </summary>
    public Payer? Payer { get; set; }

    /// <summary>
    /// Type of payment. Typically 'CARD' or 'INVOICE'. Up to payment processor to define.
    /// </summary>
    public string? PaymentType { get; set; }

    /// <summary>
    /// The payment method, for example Visa or Mastercard. Up to payment processor to define.
    /// </summary>
    public string? PaymentMethod { get; set; }

    /// <summary>
    /// The time and date the payment was created.
    /// </summary>
    public string? CreatedDate { get; set; }

    /// <summary>
    /// The time and date the payment was charged.
    /// </summary>
    public string? ChargedDate { get; set; }

    /// <summary>
    /// If invoice was used, this will contain the invoice number.
    /// </summary>
    public InvoiceDetails? InvoiceDetails { get; set; }

    /// <summary>
    /// If card was used, this will contain the card details.
    /// </summary>
    public CardDetails? CardDetails { get; set; }
}

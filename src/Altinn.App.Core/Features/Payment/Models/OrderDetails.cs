namespace Altinn.App.Core.Features.Payment.Models;

/// <summary>
/// Wrapping class to represent a payment order
/// </summary>
public class OrderDetails
{
    /// <summary>
    /// The ID of the payment provider that should handle the payment
    /// </summary>
    public required string PaymentProcessorId { get; set; }

    /// <summary>
    /// The party that will receive the payment. Used in the receipt.
    /// </summary>
    public required PaymentReceiver Receiver { get; set; }

    /// <summary>
    /// The party that will make the payment. How this is used/respected can vary between payment processors. Some payment processors might require this to be set.
    /// </summary>
    public Payer? Payer { get; set; }

    /// <summary>
    /// Monetary unit of the prices in the order.
    /// </summary>
    public required string Currency { get; set; }

    /// <summary>
    /// The lines that make up the order
    /// </summary>
    public required List<PaymentOrderLine> OrderLines { get; set; }

    /// <summary>
    /// Used to tell payment processor if the payer should be a person, company or any of the two. How this is used/respected can vary between payment processors.
    /// </summary>
    public PayerType[]? AllowedPayerTypes { get; set; }

    /// <summary>
    /// Optional reference to the order. Could be used by other systems to identify the order.
    /// </summary>
    public string? OrderReference { get; set; }

    /// <summary>
    /// Sum of all order line prices excluding VAT
    /// </summary>
    public decimal TotalPriceExVat => OrderLines.Sum(x => x.PriceExVat * x.Quantity);

    /// <summary>
    /// Sum of all order line VAT
    /// </summary>
    public decimal TotalVat => OrderLines.Sum(x => x.PriceExVat * x.Quantity * x.VatPercent / 100M);

    /// <summary>
    /// Total order price including VAT
    /// </summary>
    public decimal TotalPriceIncVat => OrderLines.Sum(l => l.PriceExVat * l.Quantity * (1 + l.VatPercent / 100M));
}

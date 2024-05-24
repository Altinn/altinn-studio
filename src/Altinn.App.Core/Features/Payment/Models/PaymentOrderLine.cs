namespace Altinn.App.Core.Features.Payment.Models;

/// <summary>
/// Description of a order line in a payment.
/// </summary>
public class PaymentOrderLine
{
    /// <summary>
    /// Id of the item in the order. Could be used by other systems to identify the item
    /// </summary>
    public required string Id { get; set; }

    /// <summary>
    /// Item name to use when we don't know the language of the user
    /// </summary>
    public required string Name { get; set; }

    /// <summary>
    /// Optional TextResourceKey to use instead of name when translating the item name
    /// </summary>
    public string? TextResourceKey { get; set; }

    /// <summary>
    /// Price excluding MVA
    /// </summary>
    public required decimal PriceExVat { get; set; }

    /// <summary>
    /// Quantity of this item (defaults to 1)
    /// </summary>
    public int Quantity { get; set; } = 1;

    /// <summary>
    /// Value added tax percent. Defaults to 0 (no VAT). Gets automatically added to the price.
    /// </summary>
    /// <remarks>
    /// The value added tax percent is a decimal number. 25% VAT is represented as 25.00M.
    /// </remarks>
    public required decimal VatPercent { get; set; }

    /// <summary>
    /// The unit of the unit price, for example pcs, liters, or kg.
    /// </summary>
    public string Unit { get; set; } = "pcs";
}

namespace Altinn.App.Core.Features.Payment.Processors.Nets.Models;

/// <summary>
/// Specifies an order associated with a payment. An order must contain at least one order item. The amount of the order must match the sum of the specified order items.
/// </summary>
internal class NetsOrder
{
    /// <summary>
    /// A list of order items. At least one item must be specified.
    /// </summary>
    public required List<NetsOrderItem> Items { get; set; }

    /// <summary>
    /// The total amount of the order including VAT, if any. (Sum of all grossTotalAmounts in the order.)
    /// Allowed: &gt;0
    /// </summary>
    public required int Amount { get; set; }

    /// <summary>
    /// The currency of the payment, for example 'SEK'.
    /// Length: 3
    /// The following special characters are not supported: &lt;,&gt;,\,’,”,&amp;,\\
    /// </summary>
    public required string Currency { get; set; }

    /// <summary>
    /// A reference to recognize this order. Usually a number sequence (order number).
    /// Length: 0-128
    /// The following special characters are not supported: &lt;,&gt;,\,’,”,&amp;,\\
    /// </summary>
    public string? Reference { get; set; }
}

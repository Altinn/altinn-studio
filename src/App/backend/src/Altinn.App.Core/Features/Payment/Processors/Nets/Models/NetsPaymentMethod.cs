namespace Altinn.App.Core.Features.Payment.Processors.Nets.Models;

internal class NetsPaymentMethod
{
    /// <summary>
    /// The name of the payment method.
    /// Possible value currently is: 'easy-invoice'.
    /// </summary>
    public string? Name { get; set; }

    /// <summary>
    /// Represents a line of a customer order. An order item refers to a product that the customer has bought. A product can be anything from a physical product to an online subscription or shipping.
    /// </summary>
    public NetsOrderItem? Fee { get; set; }
}

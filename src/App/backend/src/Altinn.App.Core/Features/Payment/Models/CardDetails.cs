namespace Altinn.App.Core.Features.Payment.Models;

/// <summary>
/// The details of a payment card.
/// </summary>
public class CardDetails
{
    /// <summary>
    /// The masked PAN of the card.
    /// </summary>
    public string? MaskedPan { get; set; }

    /// <summary>
    /// The expiry date of the card.
    /// </summary>
    public string? ExpiryDate { get; set; }
}

namespace Altinn.App.Core.Features.Payment.Models;

/// <summary>
/// Represents a phone number.
/// </summary>
public class PhoneNumber
{
    /// <summary>
    /// Gets or sets the country code for the phone number.
    /// </summary>
    public string? Prefix { get; set; }

    /// <summary>
    /// Gets or sets the phone number (without the country code prefix).
    /// </summary>
    public string? Number { get; set; }
}

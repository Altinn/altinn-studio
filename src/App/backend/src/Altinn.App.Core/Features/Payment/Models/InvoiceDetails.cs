namespace Altinn.App.Core.Features.Payment.Models;

/// <summary>
/// The details of an invoice.
/// </summary>
public class InvoiceDetails
{
    /// <summary>
    /// The invoice number, if available.
    /// </summary>
    public string? InvoiceNumber { get; set; }
}

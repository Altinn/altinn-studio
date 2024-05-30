using Altinn.App.Core.Models;

namespace Altinn.App.Core.Features.Pdf;

/// <summary>
/// Null object for representing a custom PDF formatter.
/// </summary>
[Obsolete(
    "This class was used for the old PDF generator, and is used for backwards compatibility in the new one. Create a custom pdf layout instead if you need to customize the PDF layout."
)]
public class NullPdfFormatter : IPdfFormatter
{
    /// <inheritdoc/>
    public Task<LayoutSettings> FormatPdf(LayoutSettings layoutSettings, object data)
    {
        return Task.FromResult(layoutSettings);
    }
}

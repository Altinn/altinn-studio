using Altinn.App.Core.Models;

namespace Altinn.App.Core.Features.Pdf
{
    /// <summary>
    /// Null object for representing a custom PDF formatter.
    /// </summary>
    public class NullPdfFormatter : IPdfFormatter
    {
        /// <inheritdoc/>
        public Task<LayoutSettings> FormatPdf(LayoutSettings layoutSettings, object data)
        {
            return Task.FromResult(layoutSettings);
        }
    }
}

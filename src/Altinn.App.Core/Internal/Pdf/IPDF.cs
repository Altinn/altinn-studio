using Altinn.App.Core.Models;

namespace Altinn.App.Core.Internal.Pdf
{
    /// <summary>
    /// The pdf service
    /// </summary>
    public interface IPDF
    {
        /// <summary>
        /// Generates a pdf receipt for a given dataElement
        /// </summary>
        Task<Stream> GeneratePDF(PDFContext pdfContext);
    }
}

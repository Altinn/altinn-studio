using System.IO;
using System.Threading.Tasks;
using Altinn.App.Services.Models;

namespace Altinn.App.Services.Interface
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

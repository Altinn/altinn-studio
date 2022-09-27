using Altinn.App.Core.Models;

namespace Altinn.App.Core.Features
{
    /// <summary>
    /// Interface to customize PDF formatting.
    /// </summary>
    public interface IPdfFormatter
    {
        /// <summary>
        /// Method to format the PDF dynamically
        /// </summary>        
        Task<LayoutSettings> FormatPdf(LayoutSettings layoutSettings, object data);
    }
}

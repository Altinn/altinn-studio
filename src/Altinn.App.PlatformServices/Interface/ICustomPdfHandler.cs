using System.Threading.Tasks;
using Altinn.App.Common.Models;

namespace Altinn.App.PlatformServices.Interface
{
    /// <summary>
    /// Interface to customize PDF formatting.
    /// </summary>
    public interface ICustomPdfHandler
    {
        /// <summary>
        /// Method to format the PDF dynamically
        /// </summary>        
        Task<LayoutSettings> FormatPdf(LayoutSettings layoutSettings, object data);
    }
}

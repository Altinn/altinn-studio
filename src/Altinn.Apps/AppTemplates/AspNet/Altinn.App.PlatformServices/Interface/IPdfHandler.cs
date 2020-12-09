using System.Threading.Tasks;
using Altinn.App.Common.Models;

namespace Altinn.App.PlatformServices.Interface
{
    /// <summary>
    /// Interface that describes Pdf Handler
    /// </summary>
    public interface IPdfHandler
    {
        /// <summary>
        /// FormatPdf based on data model. Can hide pages or components
        /// </summary>
        /// <param name="layoutSettings">layoutSettings before possible changes</param>
        /// <param name="data">The form data</param>
        Task<LayoutSettings> FormatPdf(LayoutSettings layoutSettings, object data);
    }
}

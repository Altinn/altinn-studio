using System.Threading.Tasks;
using Altinn.App.Common.Models;
using Altinn.App.PlatformServices.Interface;

namespace Altinn.App.PlatformServices.Implementation
{
    /// <summary>
    /// Null object for representing a custom PDF handler.
    /// </summary>
    public class NullPdfHandler : ICustomPdfHandler
    {
        /// <inheritdoc/>
        public Task<LayoutSettings> FormatPdf(LayoutSettings layoutSettings, object data)
        {
            return Task.FromResult(layoutSettings);
        }
    }
}

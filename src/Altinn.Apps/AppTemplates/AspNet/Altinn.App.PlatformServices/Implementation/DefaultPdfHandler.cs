using System;
using System.Threading.Tasks;
using Altinn.App.Common.Models;
using Altinn.App.PlatformServices.Interface;

namespace Altinn.App.Services.Implementation
{
    /// <summary>
    /// Handler for formatting PDF. Does nothing
    /// </summary>
    public class DefaultPdfHandler : IPdfHandler
    {
        /// <summary>
        /// Method to format PDF
        /// </summary>
        /// <param name="layoutSettings">the layoutsettings</param>
        /// <param name="data">data object</param>
        public async Task<LayoutSettings> FormatPdf(LayoutSettings layoutSettings, object data)
        {
            return layoutSettings;
        }
    }
}

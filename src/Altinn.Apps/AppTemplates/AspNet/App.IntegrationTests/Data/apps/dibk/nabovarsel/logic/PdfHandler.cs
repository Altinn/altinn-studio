using System;
using System.Threading.Tasks;
using Altinn.App.Common.Models;
using Altinn.App.PlatformServices.Interface;

#pragma warning disable SA1300 // Element should begin with upper-case letter
namespace App.IntegrationTests.Mocks.Apps.dibk.nabovarsel
#pragma warning restore SA1300 // Element should begin with upper-case letter
{
    /// <summary>
    /// Handler for formatting PDF. Dow
    /// </summary>
    public class PdfHandler : IPdfHandler
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

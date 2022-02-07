using System.Threading.Tasks;
using Altinn.App.Common.Models;

namespace App.IntegrationTests.Mocks.Apps.Ttd.Dayplanner
{
    /// <summary>
    /// Handler for formatting PDF. 
    /// </summary>
    public class PdfHandler
    {
        /// <summary>
        /// Method to format PDF dynamic
        /// </summary>
        /// <example>
        ///     if (data.GetType() == typeof(Skjema)
        ///     {
        ///     // need to create object if not there
        ///     layoutSettings.Components.ExcludeFromPdf.Add("a23234234");
        ///     }
        /// </example>
        /// <param name="layoutSettings">the layoutsettings</param>
        /// <param name="data">data object</param>
        public async Task<LayoutSettings> FormatPdf(LayoutSettings layoutSettings, object data)
        {
            return await Task.FromResult(layoutSettings);
        }
    }   
}

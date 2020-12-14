using System.Threading.Tasks;
using Altinn.App.Common.Models;

namespace Altinn.App.AppLogic.Print
{
    /// <summary>
    /// Handler for formatting PDF. Dow
    /// </summary>
    public class PdfHandler
    {
        /// <summary>
        /// Method to format PDF dynamic
        /// </summary>
        /// <example>
        /// if (data.GetType() == typeof(Skjema)
        /// {
        ///     layoutSettings.Components = new Components() { ExcludeFromPdf = new List<string>() };
        ///     layoutSettings.Components.ExcludeFromPdf.Add("a23234234");
        /// }
        /// </example>
        /// <param name="layoutSettings">the layoutsettings</param>
        /// <param name="data">data object</param>
        public async Task<LayoutSettings> FormatPdf(LayoutSettings layoutSettings, object data)
        {
            return await Task.FromResult(layoutSettings);
        }
    }   
}

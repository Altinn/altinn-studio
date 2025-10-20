using System.Threading.Tasks;
using Altinn.App.Core.Features;
using Altinn.App.Core.Models;

namespace Altinn.App.Logic.Pdf
{
    /// <summary>
    /// Handler for formatting PDF.
    /// </summary>
    public class PdfFormatter : IPdfFormatter
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

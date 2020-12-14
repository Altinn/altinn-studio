using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.App.Common.Models;
using Altinn.App.PlatformServices.Interface;
using App.IntegrationTestsRef.Data.apps.dibk.nabovarsel;

#pragma warning disable SA1300 // Element should begin with upper-case letter
namespace App.IntegrationTests.Mocks.Apps.dibk.nabovarsel
#pragma warning restore SA1300 // Element should begin with upper-case letter
{
    /// <summary>
    /// Handler for formatting PDF. Dow
    /// </summary>
    public class PdfHandler
    {
        /// <summary>
        /// Method to format PDF
        /// </summary>
        /// <param name="layoutSettings">the layoutsettings</param>
        /// <param name="data">data object</param>
        public async Task<LayoutSettings> FormatPdf(LayoutSettings layoutSettings, object data)
        {
            if (data is SvarPaaNabovarselType)
            {
                if (layoutSettings.Components == null || layoutSettings.Components.ExcludeFromPdf == null)
                {
                    layoutSettings.Components = new Components() { ExcludeFromPdf = new List<string>() };
                }

                SvarPaaNabovarselType svar = data as SvarPaaNabovarselType;
                if (svar.eiendomByggested == null)
                {
                    layoutSettings.Components.ExcludeFromPdf.Add("a23234234");
                }
                else
                {
                    layoutSettings.Components.ExcludeFromPdf.Add("basdf23234234");
                }
            }

            return await Task.FromResult(layoutSettings);
        }
    }
}

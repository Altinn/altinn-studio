using System.Threading.Tasks;
using Altinn.App.Common.Models;
using Altinn.App.Models;
using System.Collections.Generic;

namespace App.IntegrationTests.Mocks.Apps.tdd.frontendtest{
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
            if (data is Skjema)
            {
                Skjema skjema = (Skjema)data;

                if (skjema.Radioknapp == "1")
                {
                    layoutSettings.Components.ExcludeFromPdf.AddRange(new List<string>()
                    {"reasonParents",
                    "reasonSSN",
                    "reasonCohabitant1",
                    "reasonCohabitant2",
                    "reasonFarm1",
                    "reasonFarm2",
                    "reasonFarm3",
                    "reasonFarm4",
                    "reasonFarm5",
                    "reasonNewName",
                    "reasonOthers"});
                }

                if (skjema.Radioknapp == "3")
                {
                    layoutSettings.Components.ExcludeFromPdf.AddRange(new List<string>() {"reasonRelationship",
                    "reasonCohabitant1",
                    "reasonCohabitant2",
                    "reasonFarm1",
                    "reasonFarm2",
                    "reasonFarm3",
                    "reasonFarm4",
                    "reasonFarm5",
                    "reasonNewName",
                    "reasonOthers"});
                }

                if (skjema.Radioknapp == "5")
                {
                    layoutSettings.Components.ExcludeFromPdf.AddRange(new List<string>() {"reasonRelationship",
                    "reasonParents",
                    "reasonSSN",
                    "reasonFarm1",
                    "reasonFarm2",
                    "reasonFarm3",
                    "reasonFarm4",
                    "reasonFarm5",
                    "reasonNewName",
                    "reasonOthers"});
                }

                if (skjema.Radioknapp == "7")
                {

                    layoutSettings.Components.ExcludeFromPdf.AddRange(new List<string>() {
                    "reasonRelationship",
                    "reasonParents",
                    "reasonSSN",
                    "reasonCohabitant1",
                    "reasonCohabitant2",
                    "reasonNewName",
                    "reasonOthers"});
                }

                if (skjema.Radioknapp == "8")
                {
                 layoutSettings.Components.ExcludeFromPdf.AddRange(new List<string>() {   "reasonRelationship",
                    "reasonParents",
                    "reasonSSN",
                    "reasonCohabitant1",
                    "reasonCohabitant2",
                    "reasonFarm1",
                    "reasonFarm2",
                    "reasonFarm3",
                    "reasonFarm4",
                    "reasonFarm5",
                    "reasonOthers"});
                }

                if (skjema.Radioknapp == "9")
                {
                   layoutSettings.Components.ExcludeFromPdf.AddRange(new List<string>() { "reasonRelationship",
                    "reasonParents",
                    "reasonSSN",
                    "reasonCohabitant1",
                    "reasonCohabitant2",
                    "reasonFarm1",
                    "reasonFarm2",
                    "reasonFarm3",
                    "reasonFarm4",
                    "reasonFarm5",
                    "reasonNewName"});
                }
            }
            return await Task.FromResult(layoutSettings);
        }
    }   
}

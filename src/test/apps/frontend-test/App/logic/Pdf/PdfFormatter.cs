using Altinn.App.Core.Features;
using Altinn.App.Core.Models;
using Altinn.App.Models;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Altinn.App.logic.Pdf
{
    public class PdfFormatter : IPdfFormatter
    {
        public async Task<LayoutSettings> FormatPdf(LayoutSettings layoutSettings, object data)
        {
            if (data is Skjema)
            {
                Skjema skjema = (Skjema)data;

                // Both `components` and `components.excludeFromPdf` are optional in Settings.json,
                // so materialize them here. The components listed below must be excluded from the
                // PDF whether or not the app already declares an exclusion list.
                List<string> excludeFromPdf =
                    (layoutSettings.Components ??= new Components()).ExcludeFromPdf ??= new List<string>();

                if (skjema.Radioknapp == "1")
                {
                    excludeFromPdf.AddRange(new List<string>()
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
                    excludeFromPdf.AddRange(new List<string>() {"reasonRelationship",
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
                    excludeFromPdf.AddRange(new List<string>() {"reasonRelationship",
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

                    excludeFromPdf.AddRange(new List<string>() {
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
                    excludeFromPdf.AddRange(new List<string>() {   "reasonRelationship",
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
                    excludeFromPdf.AddRange(new List<string>() { "reasonRelationship",
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

            if (data.GetType() == typeof(NestedGroup))
            {
                UpdatePageOrder(layoutSettings.Pages?.Order, (NestedGroup)data);
            }
            return await Task.FromResult(layoutSettings);
        }
        private void UpdatePageOrder(List<string>? pageOrder, NestedGroup formdata)
        {
            var newValue = formdata?.Endringsmeldinggrp9786?.OversiktOverEndringenegrp9788?.FirstOrDefault()?.SkattemeldingEndringEtterFristNyttBelopdatadef37132?.value;
            if (pageOrder != null && newValue.HasValue && newValue > 10)
            {
                pageOrder.Remove("hide");
            }
        }
    }
}

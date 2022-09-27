using System;
using System.Threading.Tasks;
using Altinn.App.Core.Features;
using Altinn.Platform.Storage.Interface.Models;

//// using Altinn.App.Models; // <-- Uncomment this line to refer to app model(s)

namespace App.IntegrationTests.Mocks.Apps.Ttd.PresentationTextsApp
{
    /// <summary>
    /// Represents a business logic class responsible for running calculations on an instance.
    /// </summary>
    public class CalculationHandler: IDataProcessor
    {
        public async Task<bool> ProcessDataRead(Instance instance, Guid? dataId, object data)
        {
            bool changed = false;
            if (data.GetType() == typeof(Skjema))
            {
                Skjema model = (Skjema)data;

                model.OpplysningerOmArbeidstakerengrp8819 = model.OpplysningerOmArbeidstakerengrp8819 ?? new OpplysningerOmArbeidstakerengrp8819();

                model.OpplysningerOmArbeidstakerengrp8819.Skjemainstansgrp8854 = model.OpplysningerOmArbeidstakerengrp8819.Skjemainstansgrp8854 ?? new Skjemainstansgrp8854();

                model.OpplysningerOmArbeidstakerengrp8819.Skjemainstansgrp8854.IdentifikasjonsnummerKravdatadef33317 = new IdentifikasjonsnummerKravdatadef33317
                {
                    value = "calculatedValue"
                };

                changed = true;
            }

            return await Task.FromResult(changed);
        }

        public async Task<bool> ProcessDataWrite(Instance instance, Guid? dataId, object data)
        {
            return await Task.FromResult(false);
        }
    }
}

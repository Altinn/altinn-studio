using System;
using System.Threading.Tasks;
using Altinn.App.Core.Features;
using Altinn.Platform.Storage.Interface.Models;

#pragma warning disable SA1300 // Element should begin with upper-case letter
namespace App.IntegrationTests.Mocks.Apps.ttd.model_validation
#pragma warning restore SA1300 // Element should begin with upper-case letter
{
    public class CalculationHandler: IDataProcessor
    {
        public async Task<bool> ProcessDataRead(Instance instance, Guid? dataId, object data)
        {
            bool changed = false;
            if (data.GetType() == typeof(Skjema))
            {
                Skjema model = (Skjema)data;
                decimal? journalnummer = model.OpplysningerOmArbeidstakerengrp8819?.Skjemainstansgrp8854?.Journalnummerdatadef33316?.value;
                if (journalnummer != null && journalnummer == 1000)
                {
                    model.OpplysningerOmArbeidstakerengrp8819.Skjemainstansgrp8854.Journalnummerdatadef33316.value = (decimal)journalnummer + 1;
                    changed = true;
                }
            }

            return await Task.FromResult(changed);
        }

        public async Task<bool> ProcessDataWrite(Instance instance, Guid? dataId, object data)
        {
            return await Task.FromResult(false);
        }
    }
}

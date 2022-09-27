using System.Threading.Tasks;
using Altinn.App.Core.Features;
using Altinn.Platform.Storage.Interface.Models;

using Microsoft.AspNetCore.Mvc.ModelBinding;

#pragma warning disable SA1300 // Element should begin with upper-case letter
namespace App.IntegrationTests.Mocks.Apps.ttd.model_validation
#pragma warning restore SA1300 // Element should begin with upper-case letter
{
    public class ValidationHandler: IInstanceValidator
    {
        public async Task ValidateData(object instance, ModelStateDictionary validationResults)
        {
            if (instance.GetType() == typeof(Skjema))
            {
                Skjema model = (Skjema)instance;
                if (model.OpplysningerOmArbeidstakerengrp8819?.Skjemainstansgrp8854?.Journalnummerdatadef33316?.value == 1234)
                {
                    validationResults.AddModelError(
                        "opplysningerOmArbeidstakerengrp8819.skjemainstansgrp8854.journalnummerdatadef33316.value",
                        "Value cannot be 1234");
                }
            }
            
            await Task.CompletedTask;
        }

        public async Task ValidateTask(Instance instance, string taskId, ModelStateDictionary validationResults)
        {
            await Task.CompletedTask;
        }
    }
}

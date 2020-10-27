using Altinn.Platform.Storage.Interface.Models;

using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.ModelBinding;

#pragma warning disable SA1300 // Element should begin with upper-case letter
namespace App.IntegrationTests.Mocks.Apps.tdd.custom_validation
#pragma warning restore SA1300 // Element should begin with upper-case letter
{
    public class ValidationHandler
    {
        private IHttpContextAccessor _httpContextAccessor;

        public ValidationHandler(IHttpContextAccessor httpContextAccessor = null)
        {
            _httpContextAccessor = httpContextAccessor;
        }

        public void ValidateData(object instance, ModelStateDictionary validationResults)
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
        }

        public void ValidateTask(Instance instance, string taskId, ModelStateDictionary validationResults)
        {
        }
    }
}

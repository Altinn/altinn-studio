using System.Linq;

using Altinn.App.Services.Configuration;
using Altinn.Platform.Storage.Interface.Models;

using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.Extensions.Primitives;

#pragma warning disable SA1300 // Element should begin with upper-case letter
namespace App.IntegrationTests.Mocks.Apps.tdd.custom_validation
#pragma warning restore SA1300 // Element should begin with upper-case letter
{
    public class ValidationHandler
    {
        private IHttpContextAccessor _httpContextAccessor;
        private GeneralSettings _settings;
        private readonly string validationField = "opplysningerOmArbeidstakerengrp8819.skjemainstansgrp8854.journalnummerdatadef33316.value";
        private readonly string validationMessage = "Value cannot be 1234";

        public ValidationHandler(GeneralSettings settings, IHttpContextAccessor httpContextAccessor = null)
        {
            _httpContextAccessor = httpContextAccessor;
            _settings = settings;
        }

        public void ValidateData(object instance, ModelStateDictionary validationResults)
        {
            if (instance.GetType() == typeof(Skjema))
            {
                Skjema model = (Skjema)instance;

                _httpContextAccessor.HttpContext.Request.Headers
                    .TryGetValue("ValidationTriggerField", out StringValues value);
                string dataField = value.Any() ? value[0] : string.Empty;

                if (dataField == validationField)
                {
                    RunValidation(model, validationResults, true);
                    return;
                }

                RunValidation(model, validationResults);                
            }
        }

        private void RunValidation(Skjema model, ModelStateDictionary validationResults, bool singleFieldValidation = false)
        {
            if (model.OpplysningerOmArbeidstakerengrp8819?.Skjemainstansgrp8854?.Journalnummerdatadef33316?.value == 1234)
            {
                validationResults.AddModelError(validationField, validationMessage);
            }
            else if (singleFieldValidation)
            {
                validationResults.AddModelError(validationField, $"{_settings.FixedValidationPrefix}{validationMessage}");
            }
        }

        public void ValidateTask(Instance instance, string taskId, ModelStateDictionary validationResults)
        {
        }
    }
}

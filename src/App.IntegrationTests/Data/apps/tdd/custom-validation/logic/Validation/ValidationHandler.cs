using System.Linq;
using System.Threading.Tasks;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.Platform.Storage.Interface.Models;

using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Primitives;

#pragma warning disable SA1300 // Element should begin with upper-case letter
namespace App.IntegrationTests.Mocks.Apps.tdd.custom_validation
#pragma warning restore SA1300 // Element should begin with upper-case letter
{
    public class ValidationHandler : IInstanceValidator
    {
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly GeneralSettings _settings;
        private readonly string validationField = "opplysningerOmArbeidstakerengrp8819.skjemainstansgrp8854.journalnummerdatadef33316.value";
        private readonly string validationMessage = "Value cannot be 1234";

        public ValidationHandler(IOptions<GeneralSettings> settings, IHttpContextAccessor httpContextAccessor = null)
        {
            _httpContextAccessor = httpContextAccessor;
            _settings = settings.Value;
        }

#pragma warning disable CS1998 // Async method lacks 'await' operators and will run synchronously
        public async Task ValidateData(object instance, ModelStateDictionary validationResults)
#pragma warning restore CS1998 // Async method lacks 'await' operators and will run synchronously
        {
            if (instance.GetType() == typeof(Skjema))
            {
                var model = (Skjema)instance;

                _httpContextAccessor.HttpContext.Request.Headers
                    .TryGetValue("ValidationTriggerField", out StringValues value);
                string dataField = value.Any() ? value[0] : string.Empty;

                _httpContextAccessor.HttpContext.Request.Headers
                    .TryGetValue("softValidations", out StringValues softValidationValue);
                string softValidation = softValidationValue.Any() ? softValidationValue[0] : string.Empty;

                if (dataField == validationField)
                {
                    RunValidation(model, validationResults, true);
                    return;
                }

                if (softValidation == "true")
                {
                    validationResults.AddModelError("some.field", "*INFO*This is the informational message");
                    validationResults.AddModelError("some.other.field", "*SUCCESS*This is the success message");
                    validationResults.AddModelError("some.third.field", "*WARNING*This is the warning message");
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

        public async Task ValidateTask(Instance instance, string taskId, ModelStateDictionary validationResults)
        {
            await Task.CompletedTask;
        }
    }
}

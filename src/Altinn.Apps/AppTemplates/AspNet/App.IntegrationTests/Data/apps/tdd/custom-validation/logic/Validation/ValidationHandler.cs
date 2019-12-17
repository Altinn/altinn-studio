using System;
using System.ComponentModel.DataAnnotations;
using System.Collections.Generic;
using Microsoft.AspNetCore.Http;

using Altinn.App.Services.Interface;
using Microsoft.AspNetCore.Mvc.ModelBinding;

namespace App.IntegrationTests.Mocks.Apps.tdd.custom_validation
{
    public class ValidationHandler
    {
        private IHttpContextAccessor _httpContextAccessor;

        public ValidationHandler(IHttpContextAccessor httpContextAccessor = null)
        {
            _httpContextAccessor = httpContextAccessor;
        }

        /// <summary>
        /// Handles all custom validations that are not covered by the data model validation.
        /// </summary>
        /// <remarks>
        /// Validations that fail should be handled by updating the validation result object,
        /// see example.
        /// </remarks>
        /// <param name="validationResults">Object to contain any validation results</param>
        /// <example>
        ///  if ([some condition]) {
        ///      validationResults.Add(new ValidationResult([error message], new List<string>() { [affected field id] } ));
        ///  }
        /// </example>
        public void Validate(object instance, ModelStateDictionary validationResults)
        {
            if (instance.GetType() == typeof(Skjema))
            {
                Skjema model = (Skjema)instance;
                if (model.OpplysningerOmArbeidstakerengrp8819?.Skjemainstansgrp8854?.Journalnummerdatadef33316?.value == 1234)
                {
                    validationResults.AddModelError(
                        "opplysningerOmArbeidstakerengrp8819.skjemainstansgrp8854.journalnummerdatadef33316.value",
                        "Value cannot be 1234"
                    );
                }
            }
        }
    }
}

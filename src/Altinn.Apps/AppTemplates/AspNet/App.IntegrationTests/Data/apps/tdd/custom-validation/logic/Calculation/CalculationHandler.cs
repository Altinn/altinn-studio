using System;
using System.ComponentModel.DataAnnotations;
using System.Collections.Generic;
using Microsoft.AspNetCore.Http;

using Altinn.App.Services.Interface;

namespace App.IntegrationTests.Mocks.Apps.tdd.custom_validation
{
    public class CalculationHandler
    {
        private IHttpContextAccessor _httpContextAccessor;

        public CalculationHandler(IHttpContextAccessor httpContextAccessor = null)
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
        public bool Calculate(object instance)
        {
            bool changed = false;
            if (instance.GetType() == typeof(Skjema))
            {
                Skjema model = (Skjema)instance;
                decimal? journalnummer = model.OpplysningerOmArbeidstakerengrp8819?.Skjemainstansgrp8854?.Journalnummerdatadef33316?.value;
                if (journalnummer != null && journalnummer == 1000)
                {
                    model.OpplysningerOmArbeidstakerengrp8819.Skjemainstansgrp8854.Journalnummerdatadef33316.value = (decimal)journalnummer + 1;
                    changed = true;
                }
            }

            return changed;
        }
    }
}

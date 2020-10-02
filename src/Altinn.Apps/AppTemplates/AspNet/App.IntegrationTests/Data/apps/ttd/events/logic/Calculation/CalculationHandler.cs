using System;
using System.ComponentModel.DataAnnotations;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;

using Altinn.App.Services.Interface;

namespace App.IntegrationTests.Mocks.Apps.ttd.events
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
        public Task<bool> Calculate(object instance)
        {
            return Task.FromResult(false);
        }
    }
}

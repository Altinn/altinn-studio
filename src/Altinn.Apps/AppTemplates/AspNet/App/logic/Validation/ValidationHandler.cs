using System.ComponentModel.DataAnnotations;
using System.Collections.Generic;
using Microsoft.AspNetCore.Http;

using Altinn.App.Services.Interface;

namespace Altinn.App.AppLogic.Validation
{
    public class ValidationHandler : IValidationHandler
    {
        private IHttpContextAccessor _httpContextAccessor;
        public ValidationHandler(IHttpContextAccessor httpContextAccessor)
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
        public void Validate(ICollection<ValidationResult> validationResults)
        {

        }
    }

}

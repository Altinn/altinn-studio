using System;
using System.Threading.Tasks;
using Altinn.App.Services.Interface;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.ModelBinding;
// using Altinn.App.Models; // Uncomment this line to refer to app model(s)


namespace App.IntegrationTests.Mocks.Apps.tdd.sirius.AppLogic.Validation
{
    public class ValidationHandler
    {
        private IHttpContextAccessor _httpContextAccessor;
        private IInstance _instanceService;
        public ValidationHandler(IInstance instanceService, IHttpContextAccessor httpContextAccessor = null)
        {
            _httpContextAccessor = httpContextAccessor;
            _instanceService = instanceService;
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
        /// if (instance.GetType() == typeof([model class name])
        /// {
        ///     // Explicitly cast instance to correct model type
        ///     [model class name] model = ([model class name])object;
        ///
        ///     // Perform validations
        ///     if ([some condition])
        ///     {
        ///         validationResults.Add(new ValidationResult([error message], new List<string>() {[affected field id]} ));
        ///     }
        /// }
        /// </example>
        public async Task ValidateData(object instance, ModelStateDictionary validationResults)
        {   
            await Task.CompletedTask;
        }

        public async Task ValidateTask(Instance instance, string task, ModelStateDictionary validationResults)
        {
            await Task.CompletedTask;
        }
    }
}

using System;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.ModelBinding;
// using Altinn.App.Models; // Uncomment this line to refer to app model(s)


namespace Altinn.App.AppLogic.Validation
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
        public async Task ValidateData(object data, ModelStateDictionary validationResults)
        {
            await Task.CompletedTask;
        }

        /// <summary>
        /// Handles all custom validation regarding the state of the instance in a given task
        /// </summary>
        /// Validations that fail should be handled by updating the validation result object,
        /// see example.
        /// </remarks>
        /// <example>
        ///  if (taskId.Equals("Task_2"))
        ///  {
        ///     DateTime deadline = ((DateTime)instance.Created).AddDays(3);
        ///     if (DateTime.UtcNow<deadline)
        ///         {
        ///             validationResults.AddModelError("flyttemelding", $"Avslutting av task 2 er kun gyldig mellom 08-15 på hverdager.");
        ///          }
        ///   }

        /// </example>
        public async Task ValidateTask(Instance instance, string taskId, ModelStateDictionary validationResults)
        {
            await Task.CompletedTask;
        }
    }
}

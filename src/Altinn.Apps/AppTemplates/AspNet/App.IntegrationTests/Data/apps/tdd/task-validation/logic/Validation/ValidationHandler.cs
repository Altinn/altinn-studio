using Altinn.Platform.Storage.Interface.Models;

using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using System;

namespace App.IntegrationTests.Mocks.Apps.tdd.task_validation
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
        public void ValidateData(object data, ModelStateDictionary validationResults)
        {

        }

        public void ValidateTask(Instance instance, string taskId, ModelStateDictionary validationResults)
        {
            int maxTimeTask = 48;

            switch (taskId)
            {
                case "Task_1":
                    if (DateTime.UtcNow.Subtract((DateTime)instance.Process.CurrentTask.Started).TotalMinutes > maxTimeTask)
                    {
                        validationResults.AddModelError("skjema", "Task 1 should have been completed within 48 hours. Send in is no longer available.");
                    }
                    break;
                default:
                    break;
            }
        }
    }
}

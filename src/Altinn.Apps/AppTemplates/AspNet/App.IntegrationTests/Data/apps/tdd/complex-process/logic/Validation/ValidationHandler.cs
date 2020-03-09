using System;
using System.Threading.Tasks;
using Altinn.App.Services.Interface;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.ModelBinding;
// using Altinn.App.Models; // Uncomment this line to refer to app model(s)


namespace App.IntegrationTests.Mocks.Apps.tdd.complex_process.AppLogic.Validation
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
        public async Task Validate(object instance, ModelStateDictionary validationResults)
        {
            /*   HttpContext context = _httpContextAccessor.HttpContext;

               string instanceOwnerId = context.Request.RouteValues["instanceOwnerPartyId"].ToString();
               string instanceGuid = context.Request.RouteValues["instanceGuid"].ToString();

               Instance i = await _instanceService.GetInstance("complex-process", "tdd", int.Parse(instanceOwnerId), new Guid(instanceGuid));

               DateTime valid = i.Process.CurrentTask.Started.Value.AddSeconds(40);


               if (i.Process.CurrentTask.ElementId.Equals("Task_2") && DateTime.UtcNow < valid)
               {
                   validationResults.AddModelError("Time", "Validation time has not yet occured.");
               }
               */
            await Task.CompletedTask;
        }
    }
}

using System.Threading.Tasks;
using Altinn.Platform.Storage.Interface.Models;
using App.IntegrationTestsRef.Data.apps.dibk.nabovarsel;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.ModelBinding;

#pragma warning disable SA1300 // Element should begin with upper-case letter
namespace App.IntegrationTests.Mocks.Apps.dibk.nabovarsel
#pragma warning restore SA1300 // Element should begin with upper-case letter
{
    public class ValidationHandler
    {
        private IHttpContextAccessor _httpContextAccessor;

        public ValidationHandler(IHttpContextAccessor httpContextAccessor = null)
        {
            _httpContextAccessor = httpContextAccessor;
        }

        public async Task ValidateData(object instance, ModelStateDictionary validationResults)
        {
            if (instance.GetType().Equals(typeof(SvarPaaNabovarselType)))
            {
                SvarPaaNabovarselType skjema = (SvarPaaNabovarselType)instance;
                if (skjema.nabo == null)
                {
                    validationResults.AddModelError("nabo.epost",  "Error: Epost required");
                }
            }

            await Task.CompletedTask;
        }

        public async Task ValidateTask(Instance instance, string taskId, ModelStateDictionary validationResults)
        {
            await Task.CompletedTask;
        }
    }
}

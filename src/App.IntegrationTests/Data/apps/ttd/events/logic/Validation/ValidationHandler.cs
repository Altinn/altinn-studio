using System.Threading.Tasks;
using Altinn.Platform.Storage.Interface.Models;

using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.ModelBinding;

#pragma warning disable SA1300 // Element should begin with upper-case letter
namespace App.IntegrationTests.Mocks.Apps.ttd.events
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
            await Task.CompletedTask;
        }

        public async Task ValidateTask(Instance instance, string taskId, ModelStateDictionary validationResults)
        {
            await Task.CompletedTask;
        }
    }
}

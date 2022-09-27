using System;
using System.Threading.Tasks;
using Altinn.App.Core.Features;
using Altinn.Platform.Storage.Interface.Models;

using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.ModelBinding;

#pragma warning disable SA1300 // Element should begin with upper-case letter
namespace App.IntegrationTests.Mocks.Apps.tdd.task_validation
#pragma warning restore SA1300 // Element should begin with upper-case letter
{
    public class ValidationHandler: IInstanceValidator
    {
        private IHttpContextAccessor _httpContextAccessor;

        public ValidationHandler(IHttpContextAccessor httpContextAccessor = null)
        {
            _httpContextAccessor = httpContextAccessor;
        }

        public async Task ValidateData(object data, ModelStateDictionary validationResults)
        {
            await Task.CompletedTask;
        }

        public async Task ValidateTask(Instance instance, string taskId, ModelStateDictionary validationResults)
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

            await Task.CompletedTask;
        }
    }
}

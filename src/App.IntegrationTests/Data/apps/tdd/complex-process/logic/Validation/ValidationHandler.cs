using System;
using System.Threading.Tasks;
using Altinn.App.Core.Features;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Mvc.ModelBinding;

#pragma warning disable SA1300 // Element should begin with upper-case letter
namespace App.IntegrationTests.Mocks.Apps.tdd.complex_process.AppLogic.Validation
#pragma warning restore SA1300 // Element should begin with upper-case letter
{
    public class ValidationHandler: IInstanceValidator
    {
        public async Task ValidateData(object data, ModelStateDictionary validationResults)
        {
            await Task.CompletedTask;
        }

        public async Task ValidateTask(Instance instance, string taskId, ModelStateDictionary validationResults)
        {
            DateTime valid = instance.Process.CurrentTask.Started.Value.AddSeconds(10);

            switch (taskId)
            {
                case "Task_1":
                    break;
                case "Task_2":
                    if (DateTime.UtcNow < valid)
                    {
                        validationResults.AddModelError("Time", "Validation time has not yet occured.");
                    }

                    break;
                default:
                    break;
            }
           
            await Task.CompletedTask;
        }
    }
}

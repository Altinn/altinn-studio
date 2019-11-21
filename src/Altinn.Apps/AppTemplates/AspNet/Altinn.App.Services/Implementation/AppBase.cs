using Altinn.App.Common.Enums;
using Altinn.App.Service.Interface;
using Altinn.App.Services.Interface;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Altinn.App.Services.Implementation
{
    public abstract class AppBase : IAltinnApp
    {
        private readonly Application appMetadata;
        private readonly IAppResources resourceService;
        private readonly ILogger<AppBase> logger;

        public AppBase(
            IAppResources resourceService,
            ILogger<AppBase> logger)
        {
            this.appMetadata = resourceService.GetApplication("a", "b");
            this.resourceService = resourceService;
            this.logger = logger;
        }

        abstract public Type GetAppModelType(string dataType);

        abstract public object CreateNewAppModel(string dataType);

        public abstract Task<bool> RunAppEvent(AppEventType appEvent, object model, ModelStateDictionary modelState = null);

        /// <inheritdoc />
        public async Task<bool> CanEndProcessTask(string taskId, Instance instance, IValidation validationService)
        {
            // check if the task is validated
            if (instance.Process?.CurrentTask?.Validated != null)
            {
                ValidationStatus validationStatus = instance.Process.CurrentTask.Validated;

                if (validationStatus.CanCompleteTask)
                {
                    return true;
                }
            }
            else
            {
                // validate task
                List<Models.Validation.ValidationIssue> issues = await validationService.ValidateAndUpdateInstance(instance, taskId);

                if (issues.Count == 0)
                {
                    instance.Process.CurrentTask.Validated = new ValidationStatus
                    {
                        Timestamp = DateTime.UtcNow,
                        CanCompleteTask = true,
                    };

                    return true;
                }
            }            

            return false;
        }

        /// <inheritdoc />
        public async Task OnEndProcessTask(string taskId, Instance instance)        
        {
            logger.LogInformation($"OnEndProcessTask for {instance.Id}. Locking data elements connected to {taskId}");

            List<DataType> dataTypesToLock = appMetadata.DataTypes.FindAll(dt => dt.TaskId == taskId);

            foreach (DataType dataType in dataTypesToLock)
            {
                foreach (DataElement dataElement in instance.Data.FindAll(de => de.DataType == dataType.Id))
                {
                    dataElement.Locked = true;
                    logger.LogInformation($"Locking data element {dataElement.Id} of dataType {dataType}.");
                }                    
            }           
        }

        public async Task OnEndProcess(string taskId, Instance instance)
        {
            logger.LogInformation($"OnEndProcess for {instance.Id}");
        }

        public async Task OnInstantiate(Instance instance)
        {
            logger.LogInformation($"OnInstantiate for {instance.Id}");
        }

        
        public async Task OnStartProcess(string startEvent, Instance instance)
        {
            logger.LogInformation($"OnStartProcess for {instance.Id}");
        }

        public async Task OnStartProcessTask(string taskId, Instance instance)
        {
            logger.LogInformation($"OnStartProcess for {instance.Id}"); 
        }
        
    }
}

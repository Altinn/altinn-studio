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
    public class AppBase : IAltinnApp
    {
        private readonly Application appMetadata;
        private readonly IExecution resourceService;
        private readonly ILogger<AppBase> logger;

        public AppBase(IExecution resourceService, ILogger<AppBase> logger)
        {
            this.appMetadata = resourceService.GetApplication("a", "b");
            this.resourceService = resourceService;
            this.logger = logger;
        }

        public object CreateNewAppModel(string classRef)
        {
            Type appType = Type.GetType(classRef);
            return Activator.CreateInstance(appType);
        }
        public Type GetAppModelType(string classRef)
        {
            return Type.GetType(classRef);
        }

        /// <inheritdoc />
        public async Task<bool> CanEndProcessTask(string taskId, Instance instance)
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

        public Task<bool> RunAppEvent(AppEventType appEvent, object model, ModelStateDictionary modelState = null)
        {
            throw new NotImplementedException();
        }

        public async Task OnStartProcess(string startEvent, Instance instance)
        {
            logger.LogInformation($"OnStartProcess for {instance.Id}");
        }

        public async Task OnStartProcessTask(string taskId, Instance instance)
        {
            logger.LogInformation($"OnStartProcess for {instance.Id}"); 
        }

        object IAltinnApp.CreateNewAppModel(string dataType)
        {
            throw new NotImplementedException();
        }

        Task<bool> IAltinnApp.RunAppEvent(AppEventType appEvent, object model, ModelStateDictionary modelState)
        {
            throw new NotImplementedException();
        }

        Type IAltinnApp.GetAppModelType(string dataType)
        {
            throw new NotImplementedException();
        }

        Task IAltinnApp.OnInstantiate(Instance instance)
        {
            throw new NotImplementedException();
        }

        Task IAltinnApp.OnStartProcess(string startEvent, Instance instance)
        {
            throw new NotImplementedException();
        }

        Task IAltinnApp.OnStartProcessTask(string taskId, Instance instance)
        {
            throw new NotImplementedException();
        }

        Task<bool> IAltinnApp.CanEndProcessTask(string taskId, Instance instance)
        {
            throw new NotImplementedException();
        }

        Task IAltinnApp.OnEndProcessTask(string taskId, Instance instance)
        {
            throw new NotImplementedException();
        }

        Task IAltinnApp.OnEndProcess(string endEvent, Instance instance)
        {
            throw new NotImplementedException();
        }
    }
}

using Altinn.App.Common.Interface;
using Altinn.App.Services.Enums;
using Altinn.App.Services.Interface;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Altinn.App.Common.Implementation
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
    }
}

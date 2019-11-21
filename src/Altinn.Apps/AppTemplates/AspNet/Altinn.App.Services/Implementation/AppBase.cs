using Altinn.App.Common.Enums;
using Altinn.App.Service.Interface;
using Altinn.App.Services.Interface;
using Altinn.App.Services.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Altinn.App.Services.Implementation
{
    public abstract class AppBase : IAltinnApp
    {
        private readonly Application appMetadata;
        private readonly IAppResources resourceService;
        private readonly ILogger<AppBase> logger;
        private readonly IData dataService;

        public AppBase(
            IAppResources resourceService,
            ILogger<AppBase> logger,
            IData dataService)
        {
            this.appMetadata = resourceService.GetApplication();
            this.resourceService = resourceService;
            this.logger = logger;
            this.dataService = dataService;
        }

        public abstract Type GetAppModelType(string dataType);

        public abstract object CreateNewAppModel(string dataType);

        public abstract Task<bool> RunAppEvent(AppEventType appEvent, object model, ModelStateDictionary modelState = null);
        
        /// <inheritdoc />
        public async Task OnInstantiate(Instance instance)
        {
            logger.LogInformation($"OnInstantiate for {instance.Id}");

            if (instance.Process == null)
            {
                // start process

            }
        }

        /// <inheritdoc />
        public async Task OnStartProcess(string startEvent, Instance instance)
        {
            logger.LogInformation($"OnStartProcess for {instance.Id}");
        }

        /// <inheritdoc />
        public async Task OnEndProcess(string taskId, Instance instance)
        {
            logger.LogInformation($"OnEndProcess for {instance.Id}");

            // Set archived status
            instance.Status ??= new InstanceStatus();
            instance.Status.Archived = DateTime.UtcNow;
        }

        /// <inheritdoc />
        public async Task OnStartProcessTask(string taskId, Instance instance)
        {
            logger.LogInformation($"OnStartProcessTask for {instance.Id}");

            foreach (DataType dataType in appMetadata.DataTypes.Where(dt => dt.TaskId == taskId && dt.AppLogic?.AutoCreate == true))
            {
                logger.LogInformation($"autocreate data element: {dataType.Id}");

                DataElement dataElement = instance.Data.Find(d => d.DataType == dataType.Id);

                if (dataElement == null)
                {
                    dynamic data = CreateNewAppModel(dataType.AppLogic.ClassRef);
                    Type type = GetAppModelType(dataType.AppLogic.ClassRef);

                    DataElement createdDataElement = await dataService.InsertFormData(instance, dataType.Id, data, type);
                    instance.Data.Add(createdDataElement);

                    logger.LogInformation($"created data element: {createdDataElement.Id}");
                }
            }
        }


        /// <inheritdoc />
        public async Task<bool> CanEndProcessTask(string taskId, Instance instance, List<ValidationIssue> validationIssues)
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
                if (validationIssues.Count == 0)
                {
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
    }
}

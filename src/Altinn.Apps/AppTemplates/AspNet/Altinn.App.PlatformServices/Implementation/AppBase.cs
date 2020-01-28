using Altinn.App.Common.Enums;
using Altinn.App.Services.Interface;
using Altinn.App.Services.Models;
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
        private readonly Application _appMetadata;
        private readonly IAppResources _resourceService;
        private readonly ILogger<AppBase> _logger;
        private readonly IData _dataService;
        private readonly IProcess _processService;
        private readonly IPDF _pdfService;
        private readonly IPrefill _prefillService;

        public AppBase(
            IAppResources resourceService,
            ILogger<AppBase> logger,
            IData dataService,
            IProcess processService,
            IPDF pdfService,
            IPrefill prefillService)
        {
            _appMetadata = resourceService.GetApplication();
            _resourceService = resourceService;
            _logger = logger;
            _dataService = dataService;
            _processService = processService;
            _pdfService = pdfService;
            _prefillService = prefillService;
        }

        public abstract Type GetAppModelType(string dataType);

        public abstract object CreateNewAppModel(string dataType);

        public abstract Task<bool> RunAppEvent(AppEventType appEvent, object model, ModelStateDictionary modelState = null);

        public abstract Task RunValidation(object instance, ModelStateDictionary validationResults);

        public abstract Task<bool> RunCalculation(object instance);

        public abstract Task<InstantiationValidationResult> RunInstantiationValidation(Instance instance);

        public abstract Task RunDataCreation(Instance instance, object data);

        /// <inheritdoc />
        public Task<string> OnInstantiateGetStartEvent()
        {
            _logger.LogInformation($"OnInstantiate: GetStartEvent");

            // return start event
            return Task.FromResult("StartEvent_1");
        }

        /// <inheritdoc />
        public async Task OnStartProcess(string startEvent, Instance instance)
        {
            _logger.LogInformation($"OnStartProcess for {instance.Id}");
        }

        /// <inheritdoc />
        public async Task OnEndProcess(string endEvent, Instance instance)
        {
            _logger.LogInformation($"OnEndProcess for {instance.Id}, endEvent: {endEvent}");

            if (endEvent != null && endEvent.Equals("EndEvent_1"))
            {
                await _pdfService.GenerateAndStoreReceiptPDF(instance);
            }

            // Set archived status
            instance.Status ??= new InstanceStatus();
            instance.Status.Archived = DateTime.UtcNow;
        }

        /// <inheritdoc />
        public async Task OnStartProcessTask(string taskId, Instance instance)
        {
            _logger.LogInformation($"OnStartProcessTask for {instance.Id}");

            foreach (DataType dataType in _appMetadata.DataTypes.Where(dt => dt.TaskId == taskId && dt.AppLogic?.AutoCreate == true))
            {
                _logger.LogInformation($"autocreate data element: {dataType.Id}");

                DataElement dataElement = instance.Data.Find(d => d.DataType == dataType.Id);

                if (dataElement == null)
                {
                    dynamic data = CreateNewAppModel(dataType.AppLogic.ClassRef);
                    // runs prefill from repo configuration if config exists
                    await _prefillService.PrefillDataModel(instance.InstanceOwner.PartyId, dataType.Id, data);
                    await RunDataCreation(instance, data);
                    Type type = GetAppModelType(dataType.AppLogic.ClassRef);

                    DataElement createdDataElement = await _dataService.InsertFormData(instance, dataType.Id, data, type);
                    instance.Data.Add(createdDataElement);

                    _logger.LogInformation($"created data element: {createdDataElement.Id}");
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
            _logger.LogInformation($"OnEndProcessTask for {instance.Id}. Locking data elements connected to {taskId}");

            List<DataType> dataTypesToLock = _appMetadata.DataTypes.FindAll(dt => dt.TaskId == taskId);

            foreach (DataType dataType in dataTypesToLock)
            {
                foreach (DataElement dataElement in instance.Data.FindAll(de => de.DataType == dataType.Id))
                {
                    dataElement.Locked = true;
                    _logger.LogInformation($"Locking data element {dataElement.Id} of dataType {dataType.Id}.");
                    await _dataService.Update(instance, dataElement);
                }
            }
        }
    }
}

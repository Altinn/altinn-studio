using System;
using System.Threading.Tasks;
using Altinn.App.PlatformServices.Interface;
using Altinn.App.Services.Implementation;
using Altinn.App.Services.Interface;

using Altinn.App.Services.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;

using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.Extensions.Logging;

#pragma warning disable SA1300 // Element should begin with upper-case letter
namespace App.IntegrationTests.Mocks.Apps.Tdd.Frontendtest
#pragma warning restore SA1300 // Element should begin with upper-case letter
{
    public class App : AppBase, IAltinnApp
    {
        private readonly ILogger<App> _logger;
        private readonly ValidationHandler _validationHandler;
        private readonly CalculationHandler _calculationHandler;
        private readonly InstantiationHandler _instantiationHandler;

        public App(
        IAppResources appResourcesService,
        ILogger<App> logger,
        IData dataService,
        IPdfService pdfService,
        IProfile profileService,
        IRegister registerService,
        IPrefill prefillService,
        IInstance instanceService,
        IHttpContextAccessor httpContextAccessor) : base(
            appResourcesService,
            logger,
            dataService,
            pdfService,
            prefillService,
            instanceService,
            httpContextAccessor)
            {
                _logger = logger;
                _validationHandler = new ValidationHandler(httpContextAccessor);
                _calculationHandler = new CalculationHandler();
                _instantiationHandler = new InstantiationHandler(profileService, registerService);
            }

        public override object CreateNewAppModel(string classRef)
        {
            _logger.LogInformation($"CreateNewAppModel {classRef}");

            Type appType = Type.GetType(classRef);
            return Activator.CreateInstance(appType);
        }

        public override Type GetAppModelType(string classRef)
        {
            _logger.LogInformation($"GetAppModelType {classRef}");

            return Type.GetType(classRef);
        }

        /// <summary>
        /// Run data validation event to perform custom validations on data
        /// </summary>
        /// <returns>Value indicating if the form is valid or not</returns>
        public override async Task RunDataValidation(object data, ModelStateDictionary validationResults)
        {
           await _validationHandler.ValidateData(data, validationResults);
        }

        /// <summary>
        /// Run task validation event to perform custom validations on instance
        /// </summary>
        /// <returns>Value indicating if the form is valid or not</returns>
        public override async Task RunTaskValidation(Instance instance, string taskId, ModelStateDictionary validationResults)
        {
            await _validationHandler.ValidateTask(instance, taskId, validationResults);
        }

        /// <summary>
        /// Is called to run custom instantiation validation defined by app developer.
        /// </summary>
        /// <returns>Task with validation results</returns>
        public override async Task<InstantiationValidationResult> RunInstantiationValidation(Instance instance)
        {
            return await _instantiationHandler.RunInstantiationValidation(instance);
        }

        /// <summary>
        /// Is called to run data creation (custom prefill) defined by app developer.
        /// </summary>
        public override async Task RunDataCreation(Instance instance, object data)
        {
           await _instantiationHandler.DataCreation(instance, data);
        }

        /// <summary>
        /// Hook to run code when process tasks is ended. 
        /// </summary>
        /// <param name="taskId">The current TaskId</param>
        /// <param name="instance">The instance where task is ended</param>
        /// <returns></returns>
        public override async Task RunProcessTaskEnd(string taskId, Instance instance)
        {
            await Task.CompletedTask;
        }
    }
}

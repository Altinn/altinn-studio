using System;
using System.Threading.Tasks;
using Altinn.App.PlatformServices.Interface;
using Altinn.App.Services.Implementation;
using Altinn.App.Services.Interface;
using Altinn.App.Services.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;

using App.IntegrationTests.Mocks.Apps.tdd.complex_process.AppLogic;
using App.IntegrationTests.Mocks.Apps.tdd.complex_process.AppLogic.Calculation;
using App.IntegrationTests.Mocks.Apps.tdd.complex_process.AppLogic.Validation;

using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.Extensions.Logging;

#pragma warning disable SA1300 // Element should begin with upper-case letter
namespace App.IntegrationTests.Mocks.Apps.tdd.complex_process
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
            _validationHandler = new ValidationHandler(instanceService);
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

        public override async Task RunDataValidation(object data, ModelStateDictionary validationResults)
        {
            await _validationHandler.ValidateData(data, validationResults);
        }

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

        public override async Task RunDataCreation(Instance instance, object data)
        {
            await _instantiationHandler.DataCreation(instance, data);
        }

        public override Task RunProcessTaskEnd(string taskId, Instance instance)
        {
            return Task.CompletedTask;
        }
    }
}

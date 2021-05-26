using System;
using System.Threading.Tasks;

using Altinn.App.Common.Enums;
using Altinn.App.Common.Models;

using Altinn.App.Services.Configuration;
using Altinn.App.Services.Implementation;
using Altinn.App.Services.Interface;

using Altinn.App.Services.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;

using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.Extensions.Logging;

using Microsoft.Extensions.Options;

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
        private readonly PdfHandler _pdfHandler;

        public App(
        IAppResources appResourcesService,
        ILogger<App> logger,
        IData dataService,
        IProcess processService,
        IPDF pdfService,
        IProfile profileService,
        IRegister registerService,
        IPrefill prefillService,
        IInstance instanceService,
        IOptions<GeneralSettings> settings,
        IText textService,
        IHttpContextAccessor httpContextAccessor) : base(
            appResourcesService,
            logger,
            dataService,
            processService,
            pdfService,
            prefillService,
            instanceService,
            registerService,
            settings,
            profileService,
            textService,
            httpContextAccessor)
            {
                _logger = logger;
                _validationHandler = new ValidationHandler(httpContextAccessor);
                _calculationHandler = new CalculationHandler();
                _instantiationHandler = new InstantiationHandler(profileService, registerService);
                _pdfHandler = new PdfHandler();
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
        /// Run app event
        /// </summary>
        /// <remarks>DEPRECATED METHOD, USE EVENT SPECIFIC METHOD INSTEAD</remarks>
        /// <param name="appEvent">The app event type</param>
        /// <param name="model">The service model</param>
        /// <param name="modelState">The model state</param>
        /// <returns></returns>
        public override async Task<bool> RunAppEvent(AppEventType appEvent, object model, ModelStateDictionary modelState)
        {
            _logger.LogInformation($"RunAppEvent {appEvent}");

            return await Task.FromResult(true);
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
        /// Is called to run custom calculation events defined by app developer.
        /// </summary>
        /// <param name="data">The data to perform calculations on</param>
        public override async Task<bool> RunCalculation(object data)
        {
            return await _calculationHandler.Calculate(data);
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

        public override Task<AppOptions> GetOptions(string id, AppOptions options)
        {
            return Task.FromResult(options);
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
            return;
        }

        /// <summary>
        /// Hook to run logic to hide pages or components when generatring PDF
        /// </summary>
        /// <param name="layoutSettings">The layoutsettings. Can be null and need to be created in method</param>
        /// <param name="data">The data that there is generated PDF from</param>
        /// <returns>Layoutsetting with possible hidden fields or pages</returns>
        public override async Task<LayoutSettings> FormatPdf(LayoutSettings layoutSettings, object data)
        {
            return await _pdfHandler.FormatPdf(layoutSettings, data);
        }
    }
}

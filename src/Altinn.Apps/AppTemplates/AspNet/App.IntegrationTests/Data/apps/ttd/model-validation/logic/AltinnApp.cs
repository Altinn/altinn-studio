using System;
using System.Threading.Tasks;

using Altinn.App.Common.Enums;
using Altinn.App.Common.Models;
using Altinn.App.Services.Configuration;
using Altinn.App.Services.Implementation;
using Altinn.App.Services.Interface;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

#pragma warning disable SA1300 // Element should begin with upper-case letter
namespace App.IntegrationTests.Mocks.Apps.ttd.model_validation
#pragma warning restore SA1300 // Element should begin with upper-case letter
{
    public class AltinnApp : AppBase, IAltinnApp
    {
        private readonly ValidationHandler _validationHandler;
        private readonly CalculationHandler _calculationHandler;
        private readonly InstantiationHandler _instantiationHandler;

        public AltinnApp(
            IAppResources appResourcesService,
            ILogger<AltinnApp> logger,
            IData dataService,
            IProcess processService,
            IPDF pdfService,
            IProfile profileService,
            IRegister registerService,
            IPrefill prefillService,
            IInstance instanceService,
            IOptions<GeneralSettings> settings,
            IText textService,
            IHttpContextAccessor httpContextAccessor) : base(appResourcesService, logger, dataService, processService, pdfService, prefillService, instanceService, registerService, settings, profileService, textService, httpContextAccessor)
        {
            _validationHandler = new ValidationHandler();
            _calculationHandler = new CalculationHandler();
            _instantiationHandler = new InstantiationHandler(profileService, registerService);
        }

        public override object CreateNewAppModel(string classRef)
        {
            Type appType = Type.GetType(classRef);
            return Activator.CreateInstance(appType);
        }

        public override Type GetAppModelType(string classRef)
        {
            return Type.GetType(classRef);
        }

        public override Task<bool> RunAppEvent(AppEventType appEvent, object model, ModelStateDictionary modelState = null)
        {
            return Task.FromResult(true);
        }

        public override async Task RunDataValidation(object data, ModelStateDictionary validationResults)
        {
            await Task.CompletedTask;
            _validationHandler.ValidateData(data, validationResults);
        }

        public override async Task RunTaskValidation(Instance instance, string taskId, ModelStateDictionary validationResults)
        {
            await Task.CompletedTask;
            _validationHandler.ValidateTask(instance, taskId, validationResults);
        }

        /// <summary>
        /// Run validation event to perform custom validations
        /// </summary>
        /// <param name="data">Object to contain any validation errors/warnings</param>
        /// <returns>Value indicating if the form is valid or not</returns>
        public override async Task<bool> RunCalculation(object data)
        {
            await Task.CompletedTask;
            return _calculationHandler.Calculate(data);
        }

        /// <summary>
        /// Is called to run custom calculation events defined by app developer when data is read from app
        /// </summary>
        /// <param name="instance">Instance that data belongs to</param>
        /// <param name="dataId">Data id for the  data</param>
        /// <param name="data">The data to perform calculations on</param>
        public override Task<bool> RunProcessDataRead(Instance instance, Guid? dataId, object data)
        {
            return Task.FromResult(_calculationHandler.Calculate(data));
        }

        /// <summary>
        /// Run validation event to perform custom validations
        /// </summary>
        /// <param name="instance">Object to contain any validation errors/warnings</param>
        /// <returns>Value indicating if the form is valid or not</returns>
        public override async Task<Altinn.App.Services.Models.Validation.InstantiationValidationResult> RunInstantiationValidation(Instance instance)
        {
            await Task.CompletedTask;
            return _instantiationHandler.RunInstantiationValidation(instance);
        }

        /// <summary>
        /// Is called to run custom instantiation events defined by app developer.
        /// </summary>
        /// <remarks>
        /// Instantiation events include validation and data manipulation (custom prefill)
        /// </remarks>
        /// <param name="instance">The data to perform calculations on</param>
        /// <param name="data">Object containing any validation errors/warnings</param>
        /// <returns>Task to indicate when calculation is completed</returns>
        public override async Task RunDataCreation(Instance instance, object data)
        {
            await Task.CompletedTask;
            _instantiationHandler.DataCreation(instance, data);
        }

#pragma warning disable CS0672 // Member overrides obsolete member
        public override Task<AppOptions> GetOptions(string id, AppOptions options)
#pragma warning restore CS0672 // Member overrides obsolete member
        {
            return Task.FromResult(options);
        }

        public override Task RunProcessTaskEnd(string taskId, Instance instance)
        {
            return Task.CompletedTask;
        }

        public override async Task<LayoutSettings> FormatPdf(LayoutSettings layoutSettings, object data)
        {
            return await Task.FromResult(layoutSettings);
        }
    }
}

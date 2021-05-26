using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;

using Altinn.App.Common.Enums;
using Altinn.App.Common.Models;
using Altinn.App.Services.Configuration;
using Altinn.App.Services.Implementation;
using Altinn.App.Services.Interface;
using Altinn.App.Services.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;

using App.IntegrationTests.Mocks.Apps.tdd.sirius.AppLogic;
using App.IntegrationTests.Mocks.Apps.tdd.sirius.AppLogic.Calculation;
using App.IntegrationTests.Mocks.Apps.tdd.sirius.AppLogic.Validation;
using App.IntegrationTestsRef.Data.apps.tdd.sirius.services;

using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

#pragma warning disable SA1300 // Element should begin with upper-case letter
namespace App.IntegrationTests.Mocks.Apps.tdd.sirius
#pragma warning restore SA1300 // Element should begin with upper-case letter
{
    public class App : AppBase, IAltinnApp
    {
        private readonly ILogger<App> _logger;
        private readonly ValidationHandler _validationHandler;
        private readonly CalculationHandler _calculationHandler;
        private readonly InstantiationHandler _instantiationHandler;
        private readonly ISiriusApi _siriusApi;
        private readonly IData _dataService;

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
            ISiriusApi siriusService,
            IOptions<GeneralSettings> settings,
            IText textService,
            IHttpContextAccessor httpContextAccessor) : base(appResourcesService, logger, dataService, processService, pdfService, prefillService, instanceService, registerService, settings, profileService, textService, httpContextAccessor)
        {
            _logger = logger;
            _validationHandler = new ValidationHandler(instanceService);
            _calculationHandler = new CalculationHandler();
            _instantiationHandler = new InstantiationHandler(profileService, registerService);
            _dataService = dataService;
            _siriusApi = siriusService;
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

        public override async Task RunDataValidation(object data, ModelStateDictionary validationResults)
        {
            await _validationHandler.ValidateData(data, validationResults);
        }

        public override async Task RunTaskValidation(Instance instance, string taskId, ModelStateDictionary validationResults)
        {
            if (taskId.Equals("Task_1"))
            {
                DataElement dataElement = instance.Data.FirstOrDefault(d => d.DataType.Equals("næringsoppgave"));
                if (dataElement != null)
                {
                    Stream næringsStream = await _dataService.GetBinaryData(instance.Org, instance.AppId, Convert.ToInt32(instance.InstanceOwner.PartyId), new Guid(instance.Id.Split("/")[1]), new Guid(dataElement.Id));
                    bool isValidNæring = await _siriusApi.IsValidNæring(næringsStream);
                    if (!isValidNæring)
                    {
                        validationResults.AddModelError(string.Empty, "invalid.næring");
                    }
                }
            }

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

        public override async Task RunDataCreation(Instance instance, object data)
        {
            await _instantiationHandler.DataCreation(instance, data);
        }

        public override Task<AppOptions> GetOptions(string id, AppOptions options)
        {
            return Task.FromResult(options);
        }

        public override async Task RunProcessTaskEnd(string taskId, Instance instance)
        {
            // Transfer from Task_1 to Task_2, need to download the PDF from tax.
            if (taskId.Equals("Task_1"))
            {
                DataElement dataElement = instance.Data.FirstOrDefault(d => d.DataType.Equals("næringsoppgave"));
                if (dataElement != null)
                {
                    Stream næringsStream = await _dataService.GetBinaryData(instance.Org, instance.AppId, Convert.ToInt32(instance.InstanceOwner.PartyId), new Guid(instance.Id.Split("/")[1]), new Guid(dataElement.Id));
                    Stream næringsPDF = await _siriusApi.GetNæringPDF(næringsStream);
                    await _dataService.InsertBinaryData(instance.Id, "næringsoppgavepdf", "application/pdf", "NæringPDF", næringsPDF);
                }
            }

            return;
        }

        public override async Task<LayoutSettings> FormatPdf(LayoutSettings layoutSettings, object data)
        {
            return await Task.FromResult(layoutSettings);
        }
    }
}

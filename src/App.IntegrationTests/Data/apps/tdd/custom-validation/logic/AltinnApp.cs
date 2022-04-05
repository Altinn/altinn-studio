using System;
using System.Threading.Tasks;
using Altinn.App.PlatformServices.Interface;
using Altinn.App.Services.Configuration;
using Altinn.App.Services.Implementation;
using Altinn.App.Services.Interface;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

#pragma warning disable SA1300 // Element should begin with upper-case letter
namespace App.IntegrationTests.Mocks.Apps.tdd.custom_validation
#pragma warning restore SA1300 // Element should begin with upper-case letter
{
    public class AltinnApp : AppBase, IAltinnApp
    {
        private readonly ValidationHandler _validationHandler;
        private readonly DataProcessingHandler _dataProcessingHandler;
        private readonly InstantiationHandler _instantiationHandler;

        public AltinnApp(
            IAppResources appResourcesService,
            ILogger<AltinnApp> logger,
            IData dataService,
            IPdfService pdfService,
            IProfile profileService,
            IRegister registerService,
            IPrefill prefillService,
            IInstance instanceService,
            IOptions<GeneralSettings> settings,
            IHttpContextAccessor httpContextAccessor) : base(
                appResourcesService, 
                logger, 
                dataService, 
                pdfService, 
                prefillService, 
                instanceService, 
                httpContextAccessor)
        {
            _validationHandler = new ValidationHandler(settings.Value, httpContextAccessor);
            _instantiationHandler = new InstantiationHandler(profileService, registerService);
            _dataProcessingHandler = new DataProcessingHandler();
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

        public override async Task<Altinn.App.Services.Models.Validation.InstantiationValidationResult> RunInstantiationValidation(Instance instance)
        {
            await Task.CompletedTask;
            return _instantiationHandler.RunInstantiationValidation(instance);
        }

        public override async Task RunDataCreation(Instance instance, object data)
        {
            await Task.CompletedTask;
            _instantiationHandler.DataCreation(instance, data);
        }

        public override Task RunProcessTaskEnd(string taskId, Instance instance)
        {
            return Task.CompletedTask;
        }

        /// <summary>
        /// Is called to run custom calculation events defined by app developer when data is read from app
        /// </summary>
        /// <param name="instance">Instance that data belongs to</param>
        /// <param name="dataId">Data id for the data</param>
        /// <param name="data">The data to perform calculations on</param>
        public override async Task<bool> RunProcessDataRead(Instance instance, Guid? dataId, object data)
        {
            return await _dataProcessingHandler.ProcessDataRead(instance, dataId, data);
        }

        /// <summary>
        /// Is called to run custom calculation events defined by app developer when data is written to app.
        /// </summary>
        /// <param name="instance">Instance that data belongs to</param>
        /// <param name="dataId">Data id for the  data</param>
        /// <param name="data">The data to perform calculations on</param>
        public override async Task<bool> RunProcessDataWrite(Instance instance, Guid? dataId, object data)
        {
            return await _dataProcessingHandler.ProcessDataWrite(instance, dataId, data);
        }
    }
}

using System;
using System.Collections.Generic;
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
namespace App.IntegrationTests.Mocks.Apps.Ttd.Issue5740
#pragma warning restore SA1300 // Element should begin with upper-case letter
{
    /// <summary>
    /// Represents the core logic of an App
    /// </summary>
    public class App : AppBase, IAltinnApp
    {
        private readonly ILogger<App> _logger;
        private readonly ValidationHandler _validationHandler;
        private readonly CalculationHandler _calculationHandler;
        private readonly InstantiationHandler _instantiationHandler;
        private readonly IInstance _instanceService;

        /// <summary>
        /// Initialize a new instance of the <see cref="App"/> class.
        /// </summary>
        /// <param name="appResourcesService">A service with access to local resources.</param>
        /// <param name="logger">A logger from the built in LoggingFactory.</param>
        /// <param name="dataService">A service with access to data storage.</param>
        /// <param name="pdfService">A service with access to the PDF generator.</param>
        /// <param name="profileService">A service with access to profile information.</param>
        /// <param name="registerService">A service with access to register information.</param>
        /// <param name="prefillService">A service with access to prefill mechanisms.</param>
        /// <param name="instanceService">A service with access to instances</param>
        /// <param name="httpContextAccessor">A context accessor</param>
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
            _instanceService = instanceService;
        }

        /// <inheritdoc />
        public override async Task<List<string>> GetPageOrder(string org, string app, int instanceOwnerId, Guid instanceGuid, string layoutSetId, string currentPage, string dataTypeId, object formData)
        {
            List<string> pageOrder = new List<string> { "Side4", "Side2", "Side1", "Side3" };
            Skjema skjema = (Skjema)formData;

            pageOrder.Add(skjema.Skjemanummer.ToString());
            await Task.CompletedTask;
            return pageOrder;
        }

        /// <inheritdoc />
        public override object CreateNewAppModel(string classRef)
        {
            _logger.LogInformation($"CreateNewAppModel {classRef}");

            Type appType = Type.GetType(classRef);
            return Activator.CreateInstance(appType);
        }

        /// <inheritdoc />
        public override Type GetAppModelType(string classRef)
        {
            _logger.LogInformation($"GetAppModelType {classRef}");

            return Type.GetType(classRef);
        }

        /// <summary>
        /// Run data validation event to perform custom validations on data
        /// </summary>
        /// <param name="data">An instance of the data to be validated.</param>
        /// <param name="validationResults">Object to contain any validation errors/warnings</param>
        /// <returns>Value indicating if the form is valid or not</returns>
        public override async Task RunDataValidation(object data, ModelStateDictionary validationResults)
        {
            await _validationHandler.ValidateData(data, validationResults);
        }

        /// <summary>
        /// Run task validation event to perform custom validations on instance
        /// </summary>
        /// <param name="instance">A reference to the current instance.</param>
        /// <param name="taskId">The name of the process step to validate based on.</param>
        /// <param name="validationResults">Object to contain any validation errors/warnings.</param>
        /// <returns>A task supporting the async await pattern.</returns>
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
        /// <param name="instance">The data to perform data creation on</param>
        /// <param name="data">The data object being created</param>
        public override async Task RunDataCreation(Instance instance, object data)
        {
            await _instantiationHandler.DataCreation(instance, data);
        }

        /// <summary>
        /// Hook to run code when process tasks is ended. 
        /// </summary>
        /// <param name="taskId">The current TaskId</param>
        /// <param name="instance">The instance where task is ended</param>
        /// <returns>A task supporting the async await pattern.</returns>
        public override async Task RunProcessTaskEnd(string taskId, Instance instance)
        {
            await Task.CompletedTask;
        }
    }
}

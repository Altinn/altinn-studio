using Altinn.App.Common.Enums;
using Altinn.App.Services.Implementation;
using Altinn.App.Services.Interface;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Threading.Tasks;

namespace App.IntegrationTests.Mocks.Apps.tdd.custom_validation
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
            IRegister registerService) : base(appResourcesService, logger, dataService, processService, pdfService)
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

        public override Task<bool> RunValidation(object instance, ICollection<ValidationResult> validationResults)
        {
            _validationHandler.Validate(instance, validationResults);
            return Task.FromResult(validationResults.Count == 0);
        }

        /// <summary>
        /// Run validation event to perform custom validations
        /// </summary>
        /// <param name="validationResults">Object to contain any validation errors/warnings</param>
        /// <returns>Value indicating if the form is valid or not</returns>
        public override async Task RunCalculation(object instance)
        {
            _calculationHandler.Calculate(instance);
        }

        /// <summary>
        /// Run validation event to perform custom validations
        /// </summary>
        /// <param name="validationResults">Object to contain any validation errors/warnings</param>
        /// <returns>Value indicating if the form is valid or not</returns>
        public override async Task<Altinn.App.Services.Models.Validation.InstantiationValidationResult> RunInstantiationValidation()
        {
            return _instantiationHandler.RunInstantiationValidation();
        }

        /// <summary>
        /// Is called to run custom instantiation events defined by app developer.
        /// </summary>
        /// <remarks>
        /// Instantiation events include validation and data manipulation (custom prefill)
        /// </remarks>
        /// <param name="instance">The data to perform calculations on</param>
        /// <param name="validationResults">Object containing any validation errors/warnings</param>
        /// <returns>Task to indicate when calculation is completed</returns>
        public override async Task RunDataCreation(object instance)
        {
            _instantiationHandler.DataCreation(instance);
        }
    }
}

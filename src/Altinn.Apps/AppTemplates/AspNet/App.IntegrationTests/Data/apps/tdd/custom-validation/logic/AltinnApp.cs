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
        private IValidationHandler _validationHandler;

        public AltinnApp(
            IAppResources appResourcesService,
            ILogger<AltinnApp> logger,
            IData dataService,
            IProcess processService,
            IValidationHandler validationHandler) : base(appResourcesService, logger, dataService, processService)
        {
            _validationHandler = validationHandler;
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

        public override Task<bool> RunValidation(object instance, Type modelType, ICollection<ValidationResult> validationResults)
        {
            _validationHandler.Validate(instance, modelType, validationResults);
            return Task.FromResult(validationResults.Count == 0);
        }
    }
}

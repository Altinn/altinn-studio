using System;
using System.Threading.Tasks;
using Altinn.App.PlatformServices.Interface;
using Altinn.App.Services.Implementation;
using Altinn.App.Services.Interface;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.Extensions.Logging;

#pragma warning disable SA1300 // Element should begin with upper-case letter
namespace App.IntegrationTests.Mocks.Apps.tdd.endring_av_navn
#pragma warning restore SA1300 // Element should begin with upper-case letter
{
    public class AltinnApp : AppBase, IAltinnApp
    {
        public AltinnApp(
            IAppResources appResourcesService,
            ILogger<AltinnApp> logger,
            IData dataService,
            IPdfService pdfService,
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
        }

        public override async Task RunTaskValidation(Instance instance, string taskId, ModelStateDictionary validationResults)
        {
            await Task.CompletedTask;
        }

        public override async Task<Altinn.App.Services.Models.Validation.InstantiationValidationResult> RunInstantiationValidation(Instance instance)
        {
            await Task.CompletedTask;
            return null;
        }

        public override async Task RunDataCreation(Instance instance, object data)
        {
            if (data is App.IntegrationTests.Mocks.Apps.tdd.endring_av_navn.Skjema)
            {
                Skjema skjema = (Skjema)data;
                skjema.Begrunnelsegrp9317 = new Begrunnelsegrp9317();
                skjema.Begrunnelsegrp9317.BegrunnelseForNyttNavngrp9318 = new BegrunnelseForNyttNavngrp9318();
                skjema.Begrunnelsegrp9317.BegrunnelseForNyttNavngrp9318.PersonFornavnAnnetBegrunnelsedatadef34948 = new PersonFornavnAnnetBegrunnelsedatadef34948() { value = "Fordi det er en enhetstest" };
            }

            await Task.CompletedTask;
        }

        public override Task RunProcessTaskEnd(string taskId, Instance instance)
        {
            return Task.CompletedTask;
        }
    }
}

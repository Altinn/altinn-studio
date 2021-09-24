using System;
using System.Collections.Generic;
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
namespace App.IntegrationTests.Mocks.Apps.tdd.endring_av_navn
#pragma warning restore SA1300 // Element should begin with upper-case letter
{
    public class AltinnApp : AppBase, IAltinnApp
    {
        public AltinnApp(
            IAppResources appResourcesService,
            ILogger<AltinnApp> logger,
            IData dataService,
            IProcess processService,
            IPDF pdfService,
            IPrefill prefillService,
            IInstance instanceService,
            IOptions<GeneralSettings> settings,
            IText textService,
            IRegister registerService,
            IProfile profileService,
            IHttpContextAccessor httpContextAccessor) : base(appResourcesService, logger, dataService, processService, pdfService, prefillService, instanceService, registerService, settings, profileService, textService, httpContextAccessor)
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

        public override Task<bool> RunAppEvent(AppEventType appEvent, object model, ModelStateDictionary modelState = null)
        {
            return Task.FromResult(true);
        }

        public override async Task RunDataValidation(object data, ModelStateDictionary validationResults)
        {
            await Task.CompletedTask;
        }

        public override async Task RunTaskValidation(Instance instance, string taskId, ModelStateDictionary validationResults)
        {
            await Task.CompletedTask;
        }

        public override Task<bool> RunCalculation(object data)
        {
            return Task.FromResult(false);
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

        public override Task<AppOptions> GetOptions(string id, AppOptions options)
        {
            if (string.IsNullOrEmpty(id))
            {
                return Task.FromResult(options);
            }

            if (id.Equals("weekdays"))
            {
                options.Options = new List<AppOption>();

                options.Options.Add(new AppOption() { Value = "1", Label = "Mandag" });
                options.Options.Add(new AppOption() { Value = "2", Label = "Tirsdag" });
                options.Options.Add(new AppOption() { Value = "3", Label = "Onsdag" });
                options.Options.Add(new AppOption() { Value = "4", Label = "Torsdag" });
                options.Options.Add(new AppOption() { Value = "5", Label = "Fredag" });
                options.Options.Add(new AppOption() { Value = "6", Label = "Lørdag" });
                options.Options.Add(new AppOption() { Value = "7", Label = "Søndag" });

                options.IsCacheable = true;
            }

            if (id.Equals("months"))
            {
                options.Options = new List<AppOption>();

                options.Options.Add(new AppOption() { Value = "1", Label = "Januar" });
                options.Options.Add(new AppOption() { Value = "2", Label = "Februar" });
                options.Options.Add(new AppOption() { Value = "3", Label = "Mars" });
                options.Options.Add(new AppOption() { Value = "4", Label = "April" });
                options.Options.Add(new AppOption() { Value = "5", Label = "Mai" });
                options.Options.Add(new AppOption() { Value = "6", Label = "Juni" });
                options.Options.Add(new AppOption() { Value = "7", Label = "Juli" });
                options.Options.Add(new AppOption() { Value = "8", Label = "August" });
                options.Options.Add(new AppOption() { Value = "9", Label = "September" });
                options.Options.Add(new AppOption() { Value = "10", Label = "Oktober" });
                options.Options.Add(new AppOption() { Value = "11", Label = "November" });
                options.Options.Add(new AppOption() { Value = "12", Label = "Desember" });
            }

            if (id.Equals("carbrands"))
            {
                options.Options.Insert(0, new AppOption() { Value = string.Empty, Label = "Velg bilmerke" });
            }

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

using Altinn.App.Common.Enums;
using Altinn.App.Common.Models;
using Altinn.App.Services.Implementation;
using Altinn.App.Services.Interface;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Threading.Tasks;

namespace App.IntegrationTests.Mocks.Apps.tdd.endring_av_navn
{
    public class AltinnApp : AppBase, IAltinnApp
    {

        public AltinnApp(IAppResources appResourcesService, ILogger<AltinnApp> logger, IData dataService, IProcess processService, IPDF pdfService, IPrefill prefillService) : base(appResourcesService, logger, dataService, processService, pdfService, prefillService)
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
        /// <summary>
        /// Run validation event to perform custom validations
        /// </summary>
        /// <param name="validationResults">Object to contain any validation errors/warnings</param>
        /// <returns>Value indicating if the form is valid or not</returns>
        public override Task<bool> RunCalculation(object data)
        {
            return Task.FromResult(false);
        }

        /// <summary>
        /// Run validation event to perform custom validations
        /// </summary>
        /// <param name="validationResults">Object to contain any validation errors/warnings</param>
        /// <returns>Value indicating if the form is valid or not</returns>
        public override async Task<Altinn.App.Services.Models.Validation.InstantiationValidationResult> RunInstantiationValidation(Instance instance)
        {
            await Task.CompletedTask;
            return null;
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
        public override async Task RunDataCreation(Instance instance, object data)
        {
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
                options.Options.Insert(0, new AppOption() { Value = "", Label = "Velg bilmerke" });
            }

            return Task.FromResult(options);
        }

        public override async Task RunProcessTaskEnd(string taskId, Instance instance)
        {
            return;
        }
    }
}

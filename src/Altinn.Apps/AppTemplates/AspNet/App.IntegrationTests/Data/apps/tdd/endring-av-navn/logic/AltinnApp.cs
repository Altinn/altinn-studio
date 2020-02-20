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

        public override async Task RunValidation(object data, ModelStateDictionary validationResults)
        {

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

                options.Options.Add(new AppOption() { Key = "1", Value = "Mandag" });
                options.Options.Add(new AppOption() { Key = "2", Value = "Tirsdag" });
                options.Options.Add(new AppOption() { Key = "3", Value = "Onsdag" });
                options.Options.Add(new AppOption() { Key = "4", Value = "Torsdag" });
                options.Options.Add(new AppOption() { Key = "5", Value = "Fredag" });
                options.Options.Add(new AppOption() { Key = "6", Value = "Lørdag" });
                options.Options.Add(new AppOption() { Key = "7", Value = "Søndag" });

                options.IsCacheable = true;
            }

            if (id.Equals("months"))
            {
                options.Options = new List<AppOption>();

                options.Options.Add(new AppOption() { Key = "1", Value = "Januar" });
                options.Options.Add(new AppOption() { Key = "2", Value = "Februar" });
                options.Options.Add(new AppOption() { Key = "3", Value = "Mars" });
                options.Options.Add(new AppOption() { Key = "4", Value = "April" });
                options.Options.Add(new AppOption() { Key = "5", Value = "Mai" });
                options.Options.Add(new AppOption() { Key = "6", Value = "Juni" });
                options.Options.Add(new AppOption() { Key = "7", Value = "Juli" });
                options.Options.Add(new AppOption() { Key = "8", Value = "August" });
                options.Options.Add(new AppOption() { Key = "9", Value = "September" });
                options.Options.Add(new AppOption() { Key = "10", Value = "Oktober" });
                options.Options.Add(new AppOption() { Key = "11", Value = "November" });
                options.Options.Add(new AppOption() { Key = "12", Value = "Desember" });
            }

            return Task.FromResult(options);
        }
    }
}

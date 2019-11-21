using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Altinn.App.Service.Interface;
using Altinn.App.Services.Configuration;
using Altinn.App.Services.Helpers;
using Altinn.App.Services.Interface;
using Altinn.App.Services.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.Extensions.Options;

namespace AltinnCore.Runtime.RestControllers
{
    /// <summary>
    /// Represents all actions related to validation of data and instances
    /// </summary>
    [Authorize]
    [ApiController]
    public class ValidateController : ControllerBase
    {
        private readonly IData dataService;
        private readonly IInstance instanceService;
        private readonly IAppResources appResourcesServices;
        private readonly UserHelper userHelper;
        private readonly IApplication appService;
        private readonly IAltinnApp altinnApp;
        private readonly IValidation validationService;

        /// <summary>
        /// Initialises a new instance of the <see cref="ValidateController"/> class
        /// </summary>
        public ValidateController(
            IOptions<GeneralSettings> generalSettings,
            IRegister registerService,
            IInstance instanceService,
            IData dataService,
            IAppResources appResourcesService,
            IProfile profileService,
            IInstanceEvent eventService,
            IApplication appService,
            IAltinnApp altinnApp,
            IValidation validationService)
        {
            this.instanceService = instanceService;
            this.dataService = dataService;
            this.appResourcesServices = appResourcesService;
            this.appService = appService;
            this.validationService = validationService;
            this.userHelper = new UserHelper(profileService, registerService, generalSettings);
        }

        /// <summary>
        /// Validate an app instance. This will validate all individual data elements, both the binary elements and the elements bound
        /// to a model, and then finally the state of the instance.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation</param>
        /// <param name="instanceOwnerPartyId">Unique id of the party that is the owner of the instance.</param>
        /// <param name="instanceGuid">Unique id to identify the instance</param>
        [Route("{org}/{app}/instances/{instanceOwnerPartyId:int}/{instanceGuid:guid}/validate")]
        public async Task<IActionResult> ValidateInstance(
            [FromRoute] string org,
            [FromRoute] string app,
            [FromRoute] int instanceOwnerPartyId,
            [FromRoute] Guid instanceGuid)
        {
            Instance instance = await instanceService.GetInstance(app, org, instanceOwnerPartyId, instanceGuid);
            if (instance == null)
            {
                return NotFound();
            }

            string taskId = instance.Process?.CurrentTask?.ElementId;
            if (taskId == null)
            {
                throw new ValidationException("Unable to validate instance without a started process.");
            }

            List<ValidationIssue> messages = await validationService.ValidateAndUpdateInstance(instance, taskId);

            await instanceService.UpdateInstance(instance);

            return Ok(messages);
        }

        /// <summary>
        /// Validate an app instance. This will validate all individual data elements, both the binary elements and the elements bound
        /// to a model, and then finally the state of the instance.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation</param>
        /// <param name="instanceOwnerId">Unique id of the party that is the owner of the instance.</param>
        /// <param name="instanceId">Unique id to identify the instance</param>
        /// <param name="dataGuid">Unique id identifying specific data element</param>
        [Route("{org}/{app}/instances/{instanceOwnerId:int}/{instanceId:guid}/data/{dataGuid:guid}/validate")]
        public async Task<IActionResult> ValidateData(
            [FromRoute] string org,
            [FromRoute] string app,
            [FromRoute] int instanceOwnerId,
            [FromRoute] Guid instanceId,
            [FromRoute] Guid dataGuid)
        {
            Instance instance = await instanceService.GetInstance(app, org, instanceOwnerId, instanceId);
            if (instance == null)
            {
                return NotFound();
            }

            // Todo. Figure out where to get this from
            Dictionary<string, Dictionary<string, string>> serviceText = new Dictionary<string, Dictionary<string, string>>();


            if (instance.Process?.CurrentTask?.ElementId == null)
            {
                throw new ValidationException("Unable to validate instance without a started process.");
            }

            List<ValidationIssue> messages = new List<ValidationIssue>();

            DataElement element = instance.Data.FirstOrDefault(d => d.Id == dataGuid.ToString());

            if (element == null)
            {
                throw new ValidationException("Unable to validate data element.");
            }

            Application application = await appService.GetApplication(org, app);

            DataType dataType = application.DataTypes.FirstOrDefault(et => et.Id == element.DataType);

            if (dataType == null)
            {
                throw new ValidationException("Unknown element type.");
            }

            messages.AddRange(await validationService.ValidateDataElement(instance, dataType, element));

            string taskId = instance.Process.CurrentTask.ElementId;
            if (!dataType.TaskId.Equals(taskId, StringComparison.OrdinalIgnoreCase))
            {
                ValidationIssue message = new ValidationIssue
                {
                    Code = ValidationIssueCodes.DataElementCodes.DataElementValidatedAtWrongTask,
                    InstanceId = instance.Id,
                    Severity = ValidationIssueSeverity.Warning,
                    DataElementId = element.Id,
                    Description = ServiceTextHelper.GetServiceText(
                        ValidationIssueCodes.DataElementCodes.DataElementValidatedAtWrongTask, serviceText, null, "nb")
                };
                messages.Add(message);
            }

            return Ok(messages);
        }            
    }
}

using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Altinn.App.Services.Helpers;
using Altinn.App.Services.Interface;
using Altinn.App.Services.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.App.Api.Controllers
{
    /// <summary>
    /// Represents all actions related to validation of data and instances
    /// </summary>
    [Authorize]
    [ApiController]
    public class ValidateController : ControllerBase
    {
        private readonly IInstance _instanceClient;
        private readonly IAppResources _appResourceService;
        private readonly IValidation _validationService;

        /// <summary>
        /// Initialises a new instance of the <see cref="ValidateController"/> class
        /// </summary>
        public ValidateController(
            IInstance instanceClient,
            IValidation validationService,
            IAppResources appResources)
        {
            _instanceClient = instanceClient;
            _validationService = validationService;
            _appResourceService = appResources;
        }

        /// <summary>
        /// Validate an app instance. This will validate all individual data elements, both the binary elements and the elements bound
        /// to a model, and then finally the state of the instance.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation</param>
        /// <param name="instanceOwnerPartyId">Unique id of the party that is the owner of the instance.</param>
        /// <param name="instanceGuid">Unique id to identify the instance</param>
        [HttpGet]
        [Route("{org}/{app}/instances/{instanceOwnerPartyId:int}/{instanceGuid:guid}/validate")]
        public async Task<IActionResult> ValidateInstance(
            [FromRoute] string org,
            [FromRoute] string app,
            [FromRoute] int instanceOwnerPartyId,
            [FromRoute] Guid instanceGuid)
        {
            Instance instance = await _instanceClient.GetInstance(app, org, instanceOwnerPartyId, instanceGuid);
            if (instance == null)
            {
                return NotFound();
            }

            string taskId = instance.Process?.CurrentTask?.ElementId;
            if (taskId == null)
            {
                throw new ValidationException("Unable to validate instance without a started process.");
            }

            List<ValidationIssue> messages = await _validationService.ValidateAndUpdateProcess(instance, taskId);

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
        [HttpGet]
        [Route("{org}/{app}/instances/{instanceOwnerId:int}/{instanceId:guid}/data/{dataGuid:guid}/validate")]
        public async Task<IActionResult> ValidateData(
            [FromRoute] string org,
            [FromRoute] string app,
            [FromRoute] int instanceOwnerId,
            [FromRoute] Guid instanceId,
            [FromRoute] Guid dataGuid)
        {
            Instance instance = await _instanceClient.GetInstance(app, org, instanceOwnerId, instanceId);
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

            Application application = _appResourceService.GetApplication();

            DataType dataType = application.DataTypes.FirstOrDefault(et => et.Id == element.DataType);

            if (dataType == null)
            {
                throw new ValidationException("Unknown element type.");
            }

            messages.AddRange(await _validationService.ValidateDataElement(instance, dataType, element));

            string taskId = instance.Process.CurrentTask.ElementId;
            if (!dataType.TaskId.Equals(taskId, StringComparison.OrdinalIgnoreCase))
            {
                ValidationIssue message = new ValidationIssue
                {
                    Code = ValidationIssueCodes.DataElementCodes.DataElementValidatedAtWrongTask,
                    InstanceId = instance.Id,
                    Severity = ValidationIssueSeverity.Warning,
                    DataElementId = element.Id,
                    Description = AppTextHelper.GetAppText(
                        ValidationIssueCodes.DataElementCodes.DataElementValidatedAtWrongTask, serviceText, null, "nb")
                };
                messages.Add(message);
            }

            return Ok(messages);
        }
    }
}

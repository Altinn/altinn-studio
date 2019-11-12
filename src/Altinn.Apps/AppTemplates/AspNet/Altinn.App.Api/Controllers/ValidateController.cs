using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Altinn.App.Common.Helpers;
using Altinn.App.Common.Interface;
using Altinn.App.Common.Models;
using Altinn.App.Common.Validation;
using Altinn.App.Services.Configuration;
using Altinn.App.Services.Enums;
using Altinn.App.Services.Interface;
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
        private readonly IExecution executionService;
        private readonly UserHelper userHelper;
        private readonly IApplication appService;
        private readonly IAltinnApp altinnApp;

        /// <summary>
        /// Initialises a new instance of the <see cref="ValidateController"/> class
        /// </summary>
        public ValidateController(
            IOptions<GeneralSettings> generalSettings,
            IRegister registerService,
            IInstance instanceService,
            IData dataService,
            IExecution executionService,
            IProfile profileService,
            IInstanceEvent eventService,
            IApplication appService,
            IAltinnApp altinnApp)
        {
            this.instanceService = instanceService;
            this.dataService = dataService;
            this.executionService = executionService;
            this.appService = appService;
            this.userHelper = new UserHelper(profileService, registerService, generalSettings);

        }

        /// <summary>
        /// Validate an app instance. This will validate all individual data elements, both the binary elements and the elements bound
        /// to a model, and then finally the state of the instance.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation</param>
        /// <param name="instanceOwnerId">Unique id of the party that is the owner of the instance.</param>
        /// <param name="instanceId">Unique id to identify the instance</param>
        [Route("{org}/{app}/instances/{instanceOwnerId:int}/{instanceId:guid}/validate")]
        public async Task<IActionResult> ValidateInstance(
            [FromRoute] string org,
            [FromRoute] string app,
            [FromRoute] int instanceOwnerId,
            [FromRoute] Guid instanceId)
        {
            Instance instance = await instanceService.GetInstance(app, org, instanceOwnerId, instanceId);
            if (instance == null)
            {
                return NotFound();
            }

            string taskId = instance.Process?.CurrentTask?.ElementId;
            if (taskId == null)
            {
                throw new ValidationException("Unable to validate instance without a started process.");
            }

            Application application = await appService.GetApplication(org, app);

            // Todo. Figure out where to get this from
            Dictionary<string, Dictionary<string, string>> serviceText = new Dictionary<string, Dictionary<string, string>>();

            List<ValidationIssue> messages = new List<ValidationIssue>();
            foreach (DataType dataType in application.DataTypes.Where(et => et.TaskId == taskId))
            {
                List<DataElement> elements = instance.Data.Where(d => d.DataType == dataType.Id).ToList();

                if (dataType.MaxCount > 0 && dataType.MaxCount < elements.Count)
                {
                    ValidationIssue message = new ValidationIssue
                    {
                        Code = ValidationIssueCodes.InstanceCodes.TooManyDataElementsOfType,
                        Scope = "INSTANCE",
                        Severity = ValidationIssueSeverity.Error,
                        Description = ServiceTextHelper.GetServiceText(
                            ValidationIssueCodes.InstanceCodes.TooManyDataElementsOfType, serviceText, null, "nb-NO")
                    };
                    messages.Add(message);
                }

                if (dataType.MinCount > 0 && dataType.MinCount > elements.Count)
                {
                    ValidationIssue message = new ValidationIssue
                    {
                        Code = ValidationIssueCodes.InstanceCodes.TooFewDataElementsOfType,
                        Scope = "INSTANCE",
                        Severity = ValidationIssueSeverity.Error,
                        Description = ServiceTextHelper.GetServiceText(
                            ValidationIssueCodes.InstanceCodes.TooFewDataElementsOfType, null, null, "nb-NO")
                    };
                    messages.Add(message);
                }

                foreach (DataElement dataElement in elements)
                {
                    messages.AddRange(await ValidateDataElement(org, app, instanceOwnerId, instanceId, dataType, dataElement, serviceText));
                }
            }

            if (messages.Count == 0)
            {
                instance.Process.CurrentTask.Validated = new ValidationStatus { CanCompleteTask = true, Timestamp = DateTime.Now };

                await instanceService.UpdateInstance(instance, app, org, instanceOwnerId, instanceId);
            }

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

            messages.AddRange(await ValidateDataElement(org, app, instanceOwnerId, instanceId, dataType, element, serviceText));

            string taskId = instance.Process.CurrentTask.ElementId;
            if (!dataType.TaskId.Equals(taskId, StringComparison.OrdinalIgnoreCase))
            {
                ValidationIssue message = new ValidationIssue
                {
                    Code = ValidationIssueCodes.DataElementCodes.DataElementValidatedAtWrongTask,
                    Scope = element.DataType,
                    TargetId = element.Id,
                    Severity = ValidationIssueSeverity.Warning,
                    Description = ServiceTextHelper.GetServiceText(
                        ValidationIssueCodes.DataElementCodes.DataElementValidatedAtWrongTask, serviceText, null, "nb-NO")
                };
                messages.Add(message);
            }

            return Ok(messages);
        }

        private async Task<List<ValidationIssue>> ValidateDataElement(string org, string app, int instanceOwnerId, Guid instanceId, DataType dataType, DataElement dataElement, Dictionary<string, Dictionary<string, string>> serviceText)
        {
            List<ValidationIssue> messages = new List<ValidationIssue>();

            if (dataElement.ContentType == null)
            {
                ValidationIssue message = new ValidationIssue
                {
                    Code = ValidationIssueCodes.DataElementCodes.MissingContentType,
                    Scope = dataElement.DataType,
                    TargetId = dataElement.Id,
                    Severity = ValidationIssueSeverity.Error,
                    Description = ServiceTextHelper.GetServiceText(
                        ValidationIssueCodes.DataElementCodes.MissingContentType, serviceText, null, "nb-NO")
                };
                messages.Add(message);
            }
            else
            {
                string contentTypeWithoutEncoding = dataElement.ContentType.Split(";")[0];

                if (dataType.AllowedContentTypes.All(ct => !ct.Equals(contentTypeWithoutEncoding, StringComparison.OrdinalIgnoreCase)))
                {
                    ValidationIssue message = new ValidationIssue
                    {
                        Code = ValidationIssueCodes.DataElementCodes.ContentTypeNotAllowed,
                        Scope = dataElement.DataType,
                        TargetId = dataElement.Id,
                        Severity = ValidationIssueSeverity.Error,
                        Description = ServiceTextHelper.GetServiceText(
                            ValidationIssueCodes.DataElementCodes.ContentTypeNotAllowed, serviceText, null, "nb-NO")
                    };
                    messages.Add(message);
                }
            }

            if (dataType.MaxSize.HasValue && dataType.MaxSize > 0 && (long)dataType.MaxSize * 1024 * 1024 < dataElement.Size)
            {
                ValidationIssue message = new ValidationIssue
                {
                    Code = ValidationIssueCodes.DataElementCodes.DataElementTooLarge,
                    Scope = dataElement.DataType,
                    TargetId = dataElement.Id,
                    Severity = ValidationIssueSeverity.Error,
                    Description = ServiceTextHelper.GetServiceText(
                        ValidationIssueCodes.DataElementCodes.DataElementTooLarge, serviceText, null, "nb-NO")
                };
                messages.Add(message);
            }
          
            if (dataType.AppLogic != null)
            {
                // TODO. Figure out this datamodel type thing
                Type modelType = altinnApp.GetAppModelType("default");
                dynamic data = dataService.GetFormData(instanceId, modelType, org, app, instanceOwnerId, Guid.Parse(dataElement.Id));

                TryValidateModel(data);

                await altinnApp.RunAppEvent(AppEventType.Validation, data);

                if (!ModelState.IsValid)
                {
                    messages.AddRange(MapModelStateToIssueList(ModelState, dataElement.Id, dataElement.DataType, serviceText));
                }
            }

            return messages;
        }

        private List<ValidationIssue> MapModelStateToIssueList(ModelStateDictionary modelState, string elementId, string dataType, Dictionary<string, Dictionary<string, string>> serviceText)
        {
            List<ValidationIssue> messages = new List<ValidationIssue>();
            foreach (string modelKey in modelState.Keys)
            {
                ModelState.TryGetValue(modelKey, out ModelStateEntry entry);

                if (entry != null && entry.ValidationState == ModelValidationState.Invalid)
                {
                    foreach (ModelError error in entry.Errors)
                    {
                        ValidationIssue message = new ValidationIssue
                        {
                            Code = error.ErrorMessage,
                            Scope = dataType,
                            TargetId = elementId,
                            Field = modelKey,
                            Severity = ValidationIssueSeverity.Error,
                            Description = ServiceTextHelper.GetServiceText(error.ErrorMessage, serviceText, null, "nb-NO")
                        };
                        messages.Add(message);
                    }
                }
            }

            return messages;
        }
    }
}

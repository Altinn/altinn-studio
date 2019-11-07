using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

using Altinn.Platform.Storage.Models;

using AltinnCore.Common.Configuration;
using AltinnCore.Common.Helpers;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.Runtime.Models;
using AltinnCore.Runtime.Validation;
using AltinnCore.ServiceLibrary.Enums;
using AltinnCore.ServiceLibrary.Models;
using AltinnCore.ServiceLibrary.Services.Interfaces;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.Extensions.Options;

using Storage.Interface.Models;

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
        private readonly IPlatformServices platformService;
        private readonly IApplication appService;

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
            IPlatformServices platformService,
            IInstanceEvent eventService,
            IApplication appService)
        {
            this.instanceService = instanceService;
            this.dataService = dataService;
            this.executionService = executionService;
            this.platformService = platformService;
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
        [HttpGet]
        [Route("{org}/{app}/instances/{instanceOwnerId:int}/{instanceId:guid}/validate")]
        public async Task<IActionResult> ValidateInstance(
            [FromRoute] string org,
            [FromRoute] string app,
            [FromRoute] int instanceOwnerId,
            [FromRoute] Guid instanceId)
        {
            ServiceContext serviceContext = executionService.GetServiceContext(org, app, false);

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

            List<ValidationIssue> messages = new List<ValidationIssue>();
            foreach (ElementType elementType in application.ElementTypes.Where(et => et.Task == taskId))
            {
                List<DataElement> elements = instance.Data.Where(d => d.ElementType == elementType.Id).ToList();

                if (elementType.MaxCount > 0 && elementType.MaxCount < elements.Count)
                {
                    ValidationIssue message = new ValidationIssue
                    {
                        Code = ValidationIssueCodes.InstanceCodes.TooManyDataElementsOfType,
                        Scope = "INSTANCE",
                        Severity = ValidationIssueSeverity.Error,
                        Description = ServiceTextHelper.GetServiceText(
                            ValidationIssueCodes.InstanceCodes.TooManyDataElementsOfType, serviceContext.ServiceText, null, "nb-NO")
                    };
                    messages.Add(message);
                }

                if (elementType.MinCount > 0 && elementType.MinCount > elements.Count)
                {
                    ValidationIssue message = new ValidationIssue
                    {
                        Code = ValidationIssueCodes.InstanceCodes.TooFewDataElementsOfType,
                        Scope = "INSTANCE",
                        Severity = ValidationIssueSeverity.Error,
                        Description = ServiceTextHelper.GetServiceText(
                            ValidationIssueCodes.InstanceCodes.TooFewDataElementsOfType, serviceContext.ServiceText, null, "nb-NO")
                    };
                    messages.Add(message);
                }

                foreach (DataElement dataElement in elements)
                {
                    messages.AddRange(await ValidateDataElement(org, app, instanceOwnerId, instanceId, elementType, dataElement, serviceContext));
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
        [HttpGet]
        [Route("{org}/{app}/instances/{instanceOwnerId:int}/{instanceId:guid}/data/{dataGuid:guid}/validate")]
        public async Task<IActionResult> ValidateData(
            [FromRoute] string org,
            [FromRoute] string app,
            [FromRoute] int instanceOwnerId,
            [FromRoute] Guid instanceId,
            [FromRoute] Guid dataGuid)
        {
            ServiceContext serviceContext = executionService.GetServiceContext(org, app, false);

            Instance instance = await instanceService.GetInstance(app, org, instanceOwnerId, instanceId);
            if (instance == null)
            {
                return NotFound();
            }

            if (instance.Process?.CurrentTask == null)
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

            ElementType elementType = application.ElementTypes.FirstOrDefault(et => et.Id == element.ElementType);

            if (elementType == null)
            {
                throw new ValidationException("Unknown element type.");
            }

            messages.AddRange(await ValidateDataElement(org, app, instanceOwnerId, instanceId, elementType, element, serviceContext));

            string taskId = instance.Process.CurrentTask.ElementId;
            if (!elementType.Task.Equals(taskId, StringComparison.OrdinalIgnoreCase))
            {
                ValidationIssue message = new ValidationIssue
                {
                    Code = ValidationIssueCodes.DataElementCodes.DataElementValidatedAtWrongTask,
                    Scope = element.ElementType,
                    TargetId = element.Id,
                    Severity = ValidationIssueSeverity.Warning,
                    Description = ServiceTextHelper.GetServiceText(
                        ValidationIssueCodes.DataElementCodes.DataElementValidatedAtWrongTask, serviceContext.ServiceText, null, "nb-NO")
                };
                messages.Add(message);
            }
            
            return Ok(messages);
        }

        private async Task<List<ValidationIssue>> ValidateDataElement(string org, string app, int instanceOwnerId, Guid instanceId, ElementType elementType, DataElement dataElement, ServiceContext serviceContext)
        {
            List<ValidationIssue> messages = new List<ValidationIssue>();

            if (dataElement.ContentType == null)
            {
                ValidationIssue message = new ValidationIssue
                {
                    Code = ValidationIssueCodes.DataElementCodes.MissingContentType,
                    Scope = dataElement.ElementType,
                    TargetId = dataElement.Id,
                    Severity = ValidationIssueSeverity.Error,
                    Description = ServiceTextHelper.GetServiceText(
                        ValidationIssueCodes.DataElementCodes.MissingContentType, serviceContext.ServiceText, null, "nb-NO")
                };
                messages.Add(message);
            }
            else
            {
                string contentTypeWithoutEncoding = dataElement.ContentType.Split(";")[0];

                if (elementType.AllowedContentType.All(ct => !ct.Equals(contentTypeWithoutEncoding, StringComparison.OrdinalIgnoreCase)))
                {
                    ValidationIssue message = new ValidationIssue
                    {
                        Code = ValidationIssueCodes.DataElementCodes.ContentTypeNotAllowed,
                        Scope = dataElement.ElementType,
                        TargetId = dataElement.Id,
                        Severity = ValidationIssueSeverity.Error,
                        Description = ServiceTextHelper.GetServiceText(
                            ValidationIssueCodes.DataElementCodes.ContentTypeNotAllowed, serviceContext.ServiceText, null, "nb-NO")
                    };
                    messages.Add(message);
                }
            }

            if (elementType.MaxSize.HasValue && elementType.MaxSize > 0 && elementType.MaxSize < dataElement.FileSize)
            {
                ValidationIssue message = new ValidationIssue
                {
                    Code = ValidationIssueCodes.DataElementCodes.DataElementTooLarge,
                    Scope = dataElement.ElementType,
                    TargetId = dataElement.Id,
                    Severity = ValidationIssueSeverity.Error,
                    Description = ServiceTextHelper.GetServiceText(
                        ValidationIssueCodes.DataElementCodes.DataElementTooLarge, serviceContext.ServiceText, null, "nb-NO")
                };
                messages.Add(message);
            }

            IServiceImplementation serviceImplementation = await PrepareServiceImplementation(org, app, serviceContext);
            if (elementType.AppLogic)
            {
                Type modelType = serviceImplementation.GetServiceModelType();
                dynamic data = dataService.GetFormData(instanceId, modelType, org, app, instanceOwnerId, Guid.Parse(dataElement.Id));
                
                serviceImplementation.SetServiceModel(data);

                TryValidateModel(data);

                await serviceImplementation.RunServiceEvent(ServiceEventType.Validation);

                if (!ModelState.IsValid)
                {
                    messages.AddRange(MapModelStateToIssueList(ModelState, dataElement.Id, dataElement.ElementType, serviceContext));
                }
            }

            return messages;
        }

        private List<ValidationIssue> MapModelStateToIssueList(ModelStateDictionary modelState, string elementId, string elementType, ServiceContext serviceContext)
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
                            Scope = elementType,
                            TargetId = elementId,
                            Field = modelKey,
                            Severity = ValidationIssueSeverity.Error,
                            Description = ServiceTextHelper.GetServiceText(error.ErrorMessage, serviceContext.ServiceText, null, "nb-NO")
                        }; 
                        messages.Add(message);
                    }
                }
            }

            return messages;
        }

        /// <summary>
        /// Prepares the service implementation for a given dataElement, that has an xsd or json-schema.
        /// </summary>
        /// <param name="org">unique identifier of the organisation responsible for the app</param>
        /// <param name="app">application identifier which is unique within an organisation</param>
        /// <param name="serviceContext">The current service context</param>
        /// <param name="startApp">indicates if the app should be started or just opened</param>
        /// <returns>the serviceImplementation object which represents the application business logic</returns>
        private async Task<IServiceImplementation> PrepareServiceImplementation(string org, string app, ServiceContext serviceContext, bool startApp = false)
        {
            IServiceImplementation serviceImplementation = executionService.GetServiceImplementation(org, app, startApp);

            RequestContext requestContext = RequestHelper.GetRequestContext(Request.Query, Guid.Empty);
            requestContext.UserContext = await userHelper.GetUserContext(HttpContext);
            requestContext.Party = requestContext.UserContext.Party;

            serviceImplementation.SetContext(requestContext, serviceContext, null, ModelState);
            serviceImplementation.SetPlatformServices(platformService);

            return serviceImplementation;
        }
    }
}

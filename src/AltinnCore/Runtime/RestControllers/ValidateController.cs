using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Models;
using AltinnCore.Common.Helpers;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.Runtime.Models;
using AltinnCore.ServiceLibrary.Models;
using AltinnCore.ServiceLibrary.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AltinnCore.Runtime.RestControllers
{
    /// <summary>
    /// Represents all actions related to validation of data and instances
    /// </summary>
    [Authorize]
    [ApiController]
    public class ValidateController : ControllerBase
    {
        private readonly IRepository repositoryService;
        private readonly IInstance instanceService;
        private readonly IData dataService;
        private readonly IExecution executionService;
        private readonly UserHelper userHelper;
        private readonly IPlatformServices platformService;

        /// <summary>
        /// Initialises a new instance of the <see cref="ValidateController"/> class
        /// </summary>
        public ValidateController(IRepository repositoryService, IInstance instanceService, IData dataService, IExecution executionService, UserHelper userHelper, IPlatformServices platformService)
        {
            this.repositoryService = repositoryService;
            this.instanceService = instanceService;
            this.dataService = dataService;
            this.executionService = executionService;
            this.userHelper = userHelper;
            this.platformService = platformService;
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

            string stepType = instance.Process.CurrentTask.AltinnTaskType;

            Application application = repositoryService.GetApplication(org, app);

            List<ValidationIssue> messages = new List<ValidationIssue>();
            foreach (ElementType elementType in application.ElementTypes.Where(et => et.Task == stepType))
            {
                List<DataElement> elements = instance.Data.Where(d => d.ElementType == elementType.Id).ToList();

                if (elementType.MaxCount > 0 && elementType.MaxCount < elements.Count)
                {
                    ValidationIssue message = new ValidationIssue
                    {
                        Code = "TooManyElements",
                        Scope = $"Instance",
                        Severity = ValidationIssueSeverity.Error,
                        Description = $"The instance has too many elements of type '{elementType.Id}' according to the type definition."
                    };
                    messages.Add(message);
                }

                if (elementType.MinCount > 0 && elementType.MinCount > elements.Count)
                {
                    ValidationIssue message = new ValidationIssue
                    {
                        Code = "TooFewElements",
                        Scope = $"Instance",
                        Severity = ValidationIssueSeverity.Error,
                        Description = $"The instance requires more elements of type '{elementType.Id}' according to the type definition."
                    };
                    messages.Add(message);
                }

                foreach (DataElement dataElement in elements)
                {
                    messages.AddRange(await ValidateDataElement(org, app, instanceOwnerId, instanceId, elementType, dataElement));
                }
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
        [Route("{org}/{app}/instances/{instanceOwnerId:int}/{instanceGuid:guid}/data/{dataGuid:guid}/validate")]
        public async Task<ActionResult> ValidateData(
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

            Application application = repositoryService.GetApplication(org, app);

            throw new NotImplementedException();
        }

        /// <summary>
        /// Prepares the service implementation for a given dataElement, that has an xsd or json-schema.
        /// </summary>
        /// <param name="org">unique identifier of the organisation responsible for the app</param>
        /// <param name="app">application identifier which is unique within an organisation</param>
        /// <param name="elementType">the data element type</param>
        /// <param name="startApp">indicates if the app should be started or just opened</param>
        /// <returns>the serviceImplementation object which represents the application business logic</returns>
        private async Task<IServiceImplementation> PrepareServiceImplementation(string org, string app, string elementType, bool startApp = false)
        {
            IServiceImplementation serviceImplementation = executionService.GetServiceImplementation(org, app, startApp);

            RequestContext requestContext = RequestHelper.GetRequestContext(Request.Query, Guid.Empty);
            requestContext.UserContext = await userHelper.GetUserContext(HttpContext);
            requestContext.Party = requestContext.UserContext.Party;

            ServiceContext serviceContext = executionService.GetServiceContext(org, app, startApp);

            serviceImplementation.SetContext(requestContext, serviceContext, null, ModelState);
            serviceImplementation.SetPlatformServices(platformService);

            return serviceImplementation;
        }

        private async Task<List<ValidationIssue>> ValidateDataElement(string org, string app, int instanceOwnerId, Guid instanceId, ElementType elementType, DataElement dataElement)
        {
            List<ValidationIssue> messages = new List<ValidationIssue>();

            if (dataElement.ContentType == null)
            {
                ValidationIssue message = new ValidationIssue
                {
                    Code = "MissingContentType",
                    Scope = $"DataElement",
                    Severity = ValidationIssueSeverity.Error,
                    Description = $"Element {dataElement.Id} is missing a Content-Type"
                };
                messages.Add(message);
            }
            else
            {
                string contentTypeWithoutEncoding = dataElement.ContentType.Split(";")[0];

                if (!elementType.AllowedContentType.Contains(contentTypeWithoutEncoding))
                {
                    ValidationIssue message = new ValidationIssue
                    {
                        Code = "ContentTypeNotAllowed",
                        Scope = $"DataElement",
                        Severity = ValidationIssueSeverity.Error,
                        Description = $"Element {dataElement.Id} has a Content-Type not in the list of allowed content types listed for element type '{elementType.Id}'."
                    };
                    messages.Add(message);
                }
            }

            if (elementType.MaxSize.HasValue && elementType.MaxSize > 0 && elementType.MaxSize < dataElement.FileSize)
            {
                ValidationIssue message = new ValidationIssue
                {
                    Code = "TooLarge",
                    Scope = $"DataElement",
                    Severity = ValidationIssueSeverity.Error,
                    Description = $"Element '{dataElement.Id}' is too large as stated by element type '{elementType.Id}'."
                };
                messages.Add(message);
            }

            if (elementType.AppLogic)
            {
                Stream data = await dataService.GetData(org, app, instanceOwnerId, instanceId, Guid.Parse(dataElement.Id));
            }

            return messages;
        }
    }
}

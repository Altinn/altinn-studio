using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using System.Web;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Infrastructure.GitRepository;
using Altinn.Studio.Designer.Services.Interfaces;
using LibGit2Sharp;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.Designer.Controllers.Preview
{
    [Authorize]
    [AutoValidateAntiforgeryToken]
    [Route("{org:regex(^(?!designer))}/{app:regex(^(?!datamodels$)[[a-z]][[a-z0-9-]]{{1,28}}[[a-z0-9]]$)}/instances")]
    public class InstancesController(IHttpContextAccessor httpContextAccessor,
        IPreviewService previewService,
        IAltinnGitRepositoryFactory altinnGitRepositoryFactory
    ) : Controller
    {
        /// <summary>
        /// Action for creating the mocked instance object
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="instanceOwnerPartyId"></param>
        /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
        /// <returns>The mocked instance object</returns>
        [HttpPost]
        public async Task<ActionResult<Instance>> Instances(string org, string app, [FromQuery] int? instanceOwnerPartyId, CancellationToken cancellationToken)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(httpContextAccessor.HttpContext);
            string refererHeader = Request.Headers["Referer"];
            string layoutSetName = GetSelectedLayoutSetInEditorFromRefererHeader(refererHeader);
            Instance mockInstance = await previewService.GetMockInstance(org, app, developer, instanceOwnerPartyId, layoutSetName, cancellationToken);
            return Ok(mockInstance);
        }

        /// <summary>
        /// Action for getting a mocked response for the current task connected to the instance
        /// </summary>
        /// <returns>The processState</returns>
        [HttpGet("{partyId}/{instanceGuId}/process")]
        public async Task<ActionResult<AppProcessState>> Process(string org, string app, [FromRoute] int partyId, CancellationToken cancellationToken)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(httpContextAccessor.HttpContext);
            string refererHeader = Request.Headers["Referer"];
            string layoutSetName = GetSelectedLayoutSetInEditorFromRefererHeader(refererHeader);
            Instance mockInstance = await previewService.GetMockInstance(org, app, developer, partyId, layoutSetName, cancellationToken);
            List<string> tasks = await previewService.GetTasksForAllLayoutSets(org, app, developer, cancellationToken);
            AppProcessState processState = new AppProcessState(mockInstance.Process)
            {
                ProcessTasks = tasks != null
                    ? new List<AppProcessTaskTypeInfo>(tasks?.ConvertAll(task => new AppProcessTaskTypeInfo { ElementId = task, AltinnTaskType = "data" }))
                    : null
            };

            return Ok(processState);
        }

        /// <summary>
        /// Endpoint to get instance for next process step
        /// </summary>
        /// <returns>A mocked instance object</returns>
        [HttpGet("{partyId}/{instanceGuId}")]
        public async Task<ActionResult<Instance>> InstanceForNextTask(string org, string app, [FromRoute] int partyId, CancellationToken cancellationToken)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(httpContextAccessor.HttpContext);
            string refererHeader = Request.Headers["Referer"];
            string layoutSetName = GetSelectedLayoutSetInEditorFromRefererHeader(refererHeader);
            Instance mockInstance = await previewService.GetMockInstance(org, app, developer, partyId, layoutSetName, cancellationToken);
            return Ok(mockInstance);
        }

        /// <summary>
        /// Endpoint to get active instances for apps with state/layout sets/multiple processes
        /// </summary>
        /// <returns>A list of a single mocked instance</returns>
        [HttpGet("{partyId}/active")]
        public ActionResult<List<Instance>> ActiveInstancesForAppsWithLayoutSets(string org, string app, [FromRoute] int partyId)
        {
            // Simulate never having any active instances
            List<Instance> activeInstances = new();
            return Ok(activeInstances);
        }

        /// <summary>
        /// Endpoint to validate an instance
        /// </summary>
        /// <returns>Ok</returns>
        [HttpGet("{partyId}/{instanceGuId}/validate")]
        public ActionResult ValidateInstance()
        {
            return Ok();
        }

        /// <summary>
        /// Action for getting a mocked response for the next task connected to the instance
        /// </summary>
        /// <returns>The processState object on the global mockInstance object</returns>
        [HttpGet("{partyId}/{instanceGuId}/process/next")]
        public async Task<ActionResult> ProcessNext(string org, string app, [FromRoute] int partyId, CancellationToken cancellationToken)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(httpContextAccessor.HttpContext);
            string refererHeader = Request.Headers["Referer"];
            string layoutSetName = GetSelectedLayoutSetInEditorFromRefererHeader(refererHeader);
            Instance mockInstance = await previewService.GetMockInstance(org, app, developer, partyId, layoutSetName, cancellationToken);
            return Ok(mockInstance.Process);
        }

        /// <summary>
        /// Action for mocking an end to the process in order to get receipt after "send inn" is pressed
        /// </summary>
        /// <returns>Process object where ended is set</returns>
        [HttpPut("{partyId}/{instanceGuId}/process/next")]
        public async Task<ActionResult> UpdateProcessNext(string org, string app, [FromRoute] int partyId, [FromQuery] string lang, CancellationToken cancellationToken)
        {
            string refererHeader = Request.Headers["Referer"];
            string layoutSetName = GetSelectedLayoutSetInEditorFromRefererHeader(refererHeader);
            if (string.IsNullOrEmpty(layoutSetName))
            {
                string endProcess = """{"ended": "ended"}""";
                return Ok(endProcess);
            }
            string developer = AuthenticationHelper.GetDeveloperUserName(httpContextAccessor.HttpContext);
            Instance mockInstance = await previewService.GetMockInstance(org, app, developer, partyId, layoutSetName, cancellationToken);
            return Ok(mockInstance.Process);
        }

        /// <summary>
        /// Action for getting options list for a given options list id for a given instance
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="optionListId">The id of the options list</param>
        /// <param name="language">The language for the options list</param>
        /// <param name="source">The source of the options list</param>
        /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
        /// <returns>The options list if it exists, otherwise nothing</returns>
        [HttpGet("{partyId}/{instanceGuid}/options/{optionListId}")]
        public async Task<ActionResult<string>> GetOptionsForInstance(string org, string app, string optionListId, [FromQuery] string language, [FromQuery] string source, CancellationToken cancellationToken)
        {
            try
            {
                // TODO: Need code to get dynamic options list based on language and source?
                string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
                AltinnAppGitRepository altinnAppGitRepository = altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, app, developer);
                string options = await altinnAppGitRepository.GetOptionsList(optionListId, cancellationToken);
                return Ok(options);
            }
            catch (NotFoundException)
            {
                // Return empty list since app-frontend don't handle a null result
                return Ok(new List<string>());
            }
        }

        /// <summary>
        /// Action for getting data list for a given data list id for a given instance
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="dataListId">The id of the data list</param>
        /// <param name="language">The language for the data list</param>
        /// <param name="size">The number of items to return</param>
        /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
        /// <returns>The options list if it exists, otherwise nothing</returns>
        [HttpGet("{partyId}/{instanceGuid}/datalists/{dataListId}")]
        public ActionResult<List<string>> GetDataListsForInstance(string org, string app, string dataListId, [FromQuery] string language, [FromQuery] string size, CancellationToken cancellationToken)
        {
            // TODO: Should look into whether we can get some actual data here, or if we can make an "informed" mock based on the setup.
            // For now, we just return an empty list.
            return Ok(new List<string>());
        }

        /// <summary>
        /// Action for updating data model with tag for attachment component // TODO: Figure out what actually happens here
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="currentPage">Current page in running app</param>
        /// <param name="layoutSetId">Current layout set in running app</param>
        /// <param name="dataTypeId">Connected datatype for that process task</param>
        /// <returns>The options list if it exists, otherwise nothing</returns>
        [HttpPost("{partyId}/{instanceGuid}/pages/order")]
        public IActionResult UpdateAttachmentWithTag(string org, string app, [FromQuery] string currentPage, [FromQuery] string layoutSetId, [FromQuery] string dataTypeId)
        {
            return Ok();
        }

        private static string GetSelectedLayoutSetInEditorFromRefererHeader(string refererHeader)
        {
            Uri refererUri = new(refererHeader);
            string layoutSetName = HttpUtility.ParseQueryString(refererUri.Query)["selectedLayoutSet"];

            return string.IsNullOrEmpty(layoutSetName) ? null : layoutSetName;
        }
    }
}

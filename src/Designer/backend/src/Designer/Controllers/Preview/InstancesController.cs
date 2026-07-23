using System;
using System.Collections.Generic;
using System.Text.Json.Nodes;
using System.Threading;
using System.Threading.Tasks;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Studio.Designer.Filters;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Infrastructure.GitRepository;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.App;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Services.Interfaces.Preview;
using LibGit2Sharp;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Routing;

namespace Altinn.Studio.Designer.Controllers.Preview;

[ApiController]
[Authorize]
[AutoValidateAntiforgeryToken]
[Route(
    "{org:regex(^(?!(designer|editor|dashboard|preview|admin|resourceadm|info|settings)$).+$)}/{app:regex(^(?!datamodels$)[[a-z]][[a-z0-9-]]{{1,28}}[[a-z0-9]]$)}/instances"
)]
public class InstancesController(
    IHttpContextAccessor httpContextAccessor,
    IPreviewService previewService,
    IAltinnGitRepositoryFactory altinnGitRepositoryFactory,
    IInstanceService instanceService,
    IApplicationMetadataService applicationMetadataService,
    IAppVersionService appVersionService,
    IPreviewBootstrapService previewBootstrapService
) : Controller
{
    // <summary>
    // Redirect requests from older versions of Studio to old controller
    // </summary>
    public override void OnActionExecuting(ActionExecutingContext context)
    {
        string? org = context.RouteData.Values["org"] as string;
        string? app = context.RouteData.Values["app"] as string;
        string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
        AltinnAppGitRepository altinnAppGitRepository = altinnGitRepositoryFactory.GetAltinnAppGitRepository(
            org,
            app,
            developer
        );
        // v9 apps do not always have a layout-sets.json, so AppUsesLayoutSets() can be false for them.
        // They must never be routed to the v3 (Old*) controllers, so gate the redirect on IsV9App too.
        bool isV9App = appVersionService.IsV9App(AltinnRepoEditingContext.FromOrgRepoDeveloper(org!, app!, developer));
        if (!isV9App && !altinnAppGitRepository.AppUsesLayoutSets())
        {
            RouteValueDictionary routeData = context.RouteData.Values;
            foreach (var queryParam in context.HttpContext.Request.Query)
            {
                routeData[queryParam.Key] = queryParam.Value.ToString();
            }
            context.Result = base.RedirectToActionPreserveMethod(
                controllerName: "OldInstances",
                routeValues: routeData
            );
        }
        base.OnActionExecuting(context);
    }

    /// <summary>
    /// Get instance data
    /// </summary>
    [HttpGet("{partyId}/{instanceGuid}")]
    [UseSystemTextJson]
    public ActionResult<Instance> GetInstance(
        [FromRoute] string org,
        [FromRoute] string app,
        [FromRoute] int partyId,
        [FromRoute] Guid instanceGuid,
        CancellationToken cancellationToken
    )
    {
        Instance instanceData = instanceService.GetInstance(instanceGuid);
        return Ok(instanceData);
    }

    /// <summary>
    /// Get the enriched instance (the instance with its process state embedded).
    /// New in v9 app-frontend: replaces the separate instance + process GETs.
    /// </summary>
    [HttpGet("{partyId}/{instanceGuid}/enriched")]
    public IActionResult GetEnrichedInstance(
        [FromRoute] string org,
        [FromRoute] string app,
        [FromRoute] int partyId,
        [FromRoute] Guid instanceGuid,
        CancellationToken cancellationToken
    )
    {
        string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
        Instance instanceData = instanceService.GetInstance(instanceGuid);
        JsonObject enrichedInstance = previewBootstrapService.GetEnrichedInstance(
            AltinnRepoEditingContext.FromOrgRepoDeveloper(org, app, developer),
            instanceData
        );

        return Content(enrichedInstance.ToJsonString(), "application/json");
    }

    /// <summary>
    /// Consolidated form bootstrap for a stateful instance (new in v9). Mirrors the app backend's
    /// FormBootstrapService: returns the layouts for the folder plus, for each data model, its JSON
    /// schema and initial data. Static options and validation issues are returned empty for now.
    /// </summary>
    [HttpGet("{partyId}/{instanceGuid}/bootstrap-form/{uiFolder}")]
    public async Task<IActionResult> BootstrapFormForInstance(
        [FromRoute] string org,
        [FromRoute] string app,
        [FromRoute] int partyId,
        [FromRoute] Guid instanceGuid,
        [FromRoute] string uiFolder,
        CancellationToken cancellationToken
    )
    {
        string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
        Instance instance = instanceService.GetInstance(instanceGuid);
        JsonObject formBootstrap = await previewBootstrapService.GetInstanceFormBootstrap(
            AltinnRepoEditingContext.FromOrgRepoDeveloper(org, app, developer),
            uiFolder,
            instance,
            cancellationToken
        );

        return Content(formBootstrap.ToJsonString(), "application/json");
    }

    /// <summary>
    /// Mocked payment information for a payment task so the payment task's layout (and the components the
    /// app developer has added) renders in preview. The status is "Created" - this shows the pre-payment
    /// step (order summary + pay/back buttons). It must not be "Uninitialized", which would make
    /// app-frontend initiate a real payment and redirect to an external payment provider.
    /// </summary>
    [HttpGet("{partyId}/{instanceGuid}/payment")]
    [UseSystemTextJson]
    public ActionResult GetPaymentInformation([FromQuery] string? taskId)
    {
        return Ok(
            new
            {
                taskId = taskId ?? string.Empty,
                status = "Created",
                orderDetails = BuildMockOrderDetails(),
                paymentDetails = new
                {
                    paymentId = "preview-payment",
                    redirectUrl = string.Empty,
                    payer = new
                    {
                        privatePerson = new
                        {
                            firstName = "Test",
                            lastName = "Testesen",
                            email = "test@test.com",
                        },
                    },
                },
            }
        );
    }

    /// <summary>
    /// Mocked payment order details for a payment task.
    /// </summary>
    [HttpGet("{partyId}/{instanceGuid}/payment/order-details")]
    [UseSystemTextJson]
    public ActionResult GetPaymentOrderDetails()
    {
        return Ok(BuildMockOrderDetails());
    }

    // Real order details are produced by the app's own payment logic at runtime, which the preview
    // cannot know - so we return a valid but empty order instead of fabricating amounts.
    private static object BuildMockOrderDetails() =>
        new
        {
            paymentProcessorId = "preview",
            currency = "NOK",
            orderLines = Array.Empty<object>(),
            totalPriceExVat = 0,
            totalVat = 0,
            totalPriceIncVat = 0,
        };

    /// <summary>
    /// Mocked signee list for a signing task so the signing task's layout (and the components the app
    /// developer has added) renders in preview. Empty until real preview signees are available.
    /// </summary>
    [HttpGet("{partyId}/{instanceGuid}/signing")]
    [UseSystemTextJson]
    public ActionResult GetSigneeList()
    {
        return Ok(new { signeeStates = Array.Empty<object>() });
    }

    /// <summary>
    /// Mocked list of documents to sign for a signing task.
    /// </summary>
    [HttpGet("{partyId}/{instanceGuid}/signing/data-elements")]
    [UseSystemTextJson]
    public ActionResult GetSigningDataElements()
    {
        return Ok(new { dataElements = Array.Empty<object>() });
    }

    /// <summary>
    /// Mocked list of organizations the user may sign on behalf of for a signing task.
    /// </summary>
    [HttpGet("{partyId}/{instanceGuid}/signing/organizations")]
    [UseSystemTextJson]
    public ActionResult GetSigningOrganizations()
    {
        return Ok(new { organizations = Array.Empty<object>() });
    }

    /// <summary>
    /// Create a new instance
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<Instance>> Post(
        [FromRoute] string org,
        [FromRoute] string app,
        [FromQuery] int instanceOwnerPartyId,
        [FromQuery] string? taskId,
        [FromQuery] string? language = null
    )
    {
        ApplicationMetadata applicationMetadata = await applicationMetadataService.GetApplicationMetadataFromRepository(
            org,
            app
        );
        Instance instance = instanceService.CreateInstance(
            org,
            app,
            instanceOwnerPartyId,
            taskId,
            applicationMetadata.DataTypes
        );
        return Ok(instance);
    }

    /// <summary>
    /// Endpoint to get active instances for apps with state/layout sets/multiple processes
    /// </summary>
    /// <returns>A list of a single mocked instance</returns>
    [HttpGet("{partyId}/active")]
    public ActionResult<List<Instance>> ActiveInstances(
        [FromRoute] string org,
        [FromRoute] string app,
        [FromRoute] int partyId
    )
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
    /// Action for getting a mocked response for the current task connected to the instance
    /// </summary>
    /// <returns>The processState</returns>
    [HttpGet("{partyId}/{instanceGuid}/process")]
    public async Task<ActionResult<AppProcessState>> Process(
        [FromRoute] string org,
        [FromRoute] string app,
        [FromRoute] int partyId,
        [FromRoute] Guid instanceGuid,
        CancellationToken cancellationToken
    )
    {
        string developer = AuthenticationHelper.GetDeveloperUserName(httpContextAccessor.HttpContext);
        Instance instance = instanceService.GetInstance(instanceGuid);
        List<string> tasks = await previewService.GetTasksForAllLayoutSets(org, app, developer, cancellationToken);
        AppProcessState processState = new(instance.Process)
        {
            ProcessTasks =
                tasks != null
                    ? new List<AppProcessTaskTypeInfo>(
                        tasks.ConvertAll(task => new AppProcessTaskTypeInfo
                        {
                            ElementId = task,
                            AltinnTaskType = "data",
                        })
                    )
                    : null,
        };

        return Ok(processState);
    }

    /// <summary>
    /// Action for getting a mocked response for the next task connected to the instance
    /// </summary>
    /// <returns>The processState object on the global mockInstance object</returns>
    [HttpGet("{partyId}/{instanceGuid}/process/next")]
    public ActionResult ProcessNext(
        [FromRoute] string org,
        [FromRoute] string app,
        [FromRoute] int partyId,
        [FromRoute] Guid instanceGuid,
        CancellationToken cancellationToken
    )
    {
        Instance instance = instanceService.GetInstance(instanceGuid);
        return Ok(instance.Process);
    }

    /// <summary>
    /// Action for mocking an end to the process in order to get receipt after "send inn" is pressed
    /// </summary>
    /// <returns>Process object where ended is set</returns>
    [HttpPut("{partyId}/{instanceGuid}/process/next")]
    public ActionResult UpdateProcessNext(
        [FromRoute] string org,
        [FromRoute] string app,
        [FromRoute] int partyId,
        [FromRoute] Guid instanceGuid,
        [FromQuery] string? lang,
        CancellationToken cancellationToken
    )
    {
        Instance instance = instanceService.GetInstance(instanceGuid);
        return Ok(instance.Process);
    }

    /// <summary>
    /// Action for getting options list for a given options list id for a given instance
    /// </summary>
    [HttpGet("{partyId}/{instanceGuid}/options/{optionListId}")]
    public async Task<ActionResult<string>> GetOptionsForInstance(
        [FromRoute] string org,
        [FromRoute] string app,
        [FromRoute] string optionListId,
        [FromQuery] string? language,
        [FromQuery] string? source,
        CancellationToken cancellationToken
    )
    {
        try
        {
            // TODO: Need code to get dynamic options list based on language and source?
            string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
            AltinnAppGitRepository altinnAppGitRepository = altinnGitRepositoryFactory.GetAltinnAppGitRepository(
                org,
                app,
                developer
            );
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
    [HttpGet("{partyId}/{instanceGuid}/datalists/{dataListId}")]
    public ActionResult<List<string>> GetDataListsForInstance(
        [FromRoute] string org,
        [FromRoute] string app,
        [FromRoute] string dataListId,
        [FromQuery] string? language,
        [FromQuery] string? size,
        CancellationToken cancellationToken
    )
    {
        // TODO: Should look into whether we can get some actual data here, or if we can make an "informed" mock based on the setup.
        // For now, we just return an empty list.
        return Ok(new List<string>());
    }

    /// <summary>
    /// Action for updating data model with tag for attachment component // TODO: Figure out what actually happens here
    /// </summary>
    [HttpPost("{partyId}/{instanceGuid}/pages/order")]
    public IActionResult UpdateAttachmentWithTag(
        [FromRoute] string org,
        [FromRoute] string app,
        [FromQuery] string? currentPage,
        [FromQuery] string? layoutSetId,
        [FromQuery] string? dataTypeId
    )
    {
        return Ok();
    }
}

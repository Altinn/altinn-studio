using Altinn.App.Api.Models;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.AppModel;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Pdf;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.App.Api.Controllers;

/// <summary>
/// Handles PDF related operations
/// </summary>
[Authorize]
[ApiController]
public class PdfController : ControllerBase
{
    private readonly IInstanceClient _instanceClient;
#pragma warning disable CS0618 // Type or member is obsolete
    private readonly IPdfFormatter _pdfFormatter;
    private readonly IAppResources _resources;
    private readonly IAppModel _appModel;
    private readonly IDataClient _dataClient;
    private readonly IPdfService _pdfService;
    private readonly IProcessReader _processReader;
    private readonly PdfPreviewTaskResolver _pdfPreviewTaskResolver;

    /// <summary>
    /// Initializes a new instance of the <see cref="PdfController"/> class.
    /// </summary>
    /// <param name="instanceClient">The instance client</param>
    /// <param name="pdfFormatter">The pdf formatter service</param>
    /// <param name="resources">The app resource service</param>
    /// <param name="appModel">The app model service</param>
    /// <param name="dataClient">The data client</param>
    /// <param name="pdfService">The PDF service</param>
    /// <param name="processReader">The process reader</param>
    public PdfController(
        IInstanceClient instanceClient,
#pragma warning disable CS0618 // Type or member is obsolete
        IPdfFormatter pdfFormatter,
        IAppResources resources,
        IAppModel appModel,
        IDataClient dataClient,
        IPdfService pdfService,
        IProcessReader processReader
    )
    {
        _instanceClient = instanceClient;
        _pdfFormatter = pdfFormatter;
        _resources = resources;
        _appModel = appModel;
        _dataClient = dataClient;
        _pdfService = pdfService;
        _processReader = processReader;
        _pdfPreviewTaskResolver = new PdfPreviewTaskResolver(processReader, resources);
    }

    /// <summary>
    /// Generate a preview of the PDF for a task of the instance's process.
    /// </summary>
    /// <remarks>
    /// Defaults to previewing the instance's current task. <paramref name="taskId"/> can target any other
    /// task, including a PDF or subformPdf service task — which lets an app developer preview what a
    /// service task will produce before the instance actually reaches it. Previewing a subformPdf task
    /// requires <paramref name="dataElementId"/> to say which subform data element to render.
    /// </remarks>
    [ProducesResponseType(typeof(FileStreamResult), StatusCodes.Status200OK, "application/pdf")]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest, "application/problem+json")]
    [ProducesResponseType(typeof(string), StatusCodes.Status404NotFound, "text/plain")]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound, "application/problem+json")]
    [Authorize(Policy = AuthzConstants.POLICY_INSTANCE_READ)]
    [ApiExplorerSettings(IgnoreApi = true)]
    [HttpGet("{org}/{app}/instances/{instanceOwnerPartyId:int}/{instanceGuid:guid}/pdf/preview")]
    public async Task<ActionResult> GetPdfPreview(
        [FromRoute] string org,
        [FromRoute] string app,
        [FromRoute] int instanceOwnerPartyId,
        [FromRoute] Guid instanceGuid,
        [FromQuery] string? taskId = null,
        [FromQuery] Guid? dataElementId = null
    )
    {
        var instance = await _instanceClient.GetInstance(
            app,
            org,
            instanceOwnerPartyId,
            instanceGuid,
            authenticationMethod: null,
            CancellationToken.None
        );
        if (instance == null)
        {
            return NotFound("Did not find instance or task");
        }

        return await RenderPreview(instance, taskId, dataElementId?.ToString());
    }

    /// <summary>
    /// Generate a preview of the subformPdf PDF that would be generated for a single subform data element.
    /// </summary>
    /// <remarks>
    /// Equivalent to <see cref="GetPdfPreview"/> with <c>dataElementId</c> set to <paramref name="dataGuid"/>,
    /// as a convenience for the data-element-scoped URL shape.
    /// </remarks>
    [ProducesResponseType(typeof(FileStreamResult), StatusCodes.Status200OK, "application/pdf")]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest, "application/problem+json")]
    [ProducesResponseType(typeof(string), StatusCodes.Status404NotFound, "text/plain")]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound, "application/problem+json")]
    [Authorize(Policy = AuthzConstants.POLICY_INSTANCE_READ)]
    [ApiExplorerSettings(IgnoreApi = true)]
    [HttpGet("{org}/{app}/instances/{instanceOwnerPartyId:int}/{instanceGuid:guid}/data/{dataGuid:guid}/pdf/preview")]
    public async Task<ActionResult> GetPdfPreviewForDataElement(
        [FromRoute] string org,
        [FromRoute] string app,
        [FromRoute] int instanceOwnerPartyId,
        [FromRoute] Guid instanceGuid,
        [FromRoute] Guid dataGuid,
        [FromQuery] string? taskId = null
    )
    {
        var instance = await _instanceClient.GetInstance(
            app,
            org,
            instanceOwnerPartyId,
            instanceGuid,
            authenticationMethod: null,
            CancellationToken.None
        );
        if (instance == null)
        {
            return NotFound("Did not find instance or task");
        }

        return await RenderPreview(instance, taskId, dataGuid.ToString());
    }

    private async Task<ActionResult> RenderPreview(Instance instance, string? taskId, string? dataElementId)
    {
        try
        {
            PdfPreviewTarget target = _pdfPreviewTaskResolver.Resolve(instance, taskId, dataElementId);
            Stream pdfContent = await _pdfService.GeneratePreviewPdf(instance, target, CancellationToken.None);
            return new FileStreamResult(pdfContent, "application/pdf");
        }
        catch (PdfPreviewException e)
        {
            return Problem(statusCode: e.StatusCode, detail: e.Message, title: "Could not resolve PDF preview");
        }
    }

    /// <summary>
    /// List the PDF and subformPdf service tasks in the instance's process that can be previewed, along
    /// with the subform data elements available for a subformPdf task. Used by the frontend developer
    /// tools to offer a task/data element picker for <see cref="GetPdfPreview"/>.
    /// </summary>
    [ProducesResponseType(typeof(PdfPreviewTasksResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(string), StatusCodes.Status404NotFound, "text/plain")]
    [Authorize(Policy = AuthzConstants.POLICY_INSTANCE_READ)]
    [ApiExplorerSettings(IgnoreApi = true)]
    [HttpGet("{org}/{app}/instances/{instanceOwnerPartyId:int}/{instanceGuid:guid}/pdf/preview/tasks")]
    public async Task<ActionResult<PdfPreviewTasksResponse>> GetPdfPreviewTasks(
        [FromRoute] string org,
        [FromRoute] string app,
        [FromRoute] int instanceOwnerPartyId,
        [FromRoute] Guid instanceGuid
    )
    {
        var instance = await _instanceClient.GetInstance(
            app,
            org,
            instanceOwnerPartyId,
            instanceGuid,
            authenticationMethod: null,
            CancellationToken.None
        );
        if (instance == null)
        {
            return NotFound("Did not find instance or task");
        }

        List<PdfPreviewTask> tasks = [];
        foreach (ProcessTask processTask in _processReader.GetProcessTasks())
        {
            AltinnTaskExtension? extension = processTask.ExtensionElements?.TaskExtension;
            if (extension?.TaskType == AltinnTaskTypes.Pdf)
            {
                tasks.Add(
                    new PdfPreviewTask
                    {
                        TaskId = processTask.Id,
                        Name = processTask.Name,
                        TaskType = AltinnTaskTypes.Pdf,
                        AutoPdfTaskIds = extension.PdfConfiguration?.AutoPdfTaskIds,
                    }
                );
            }
            else if (extension?.TaskType == AltinnTaskTypes.SubformPdf)
            {
                string? subformDataTypeId = extension.SubformPdfConfiguration?.SubformDataTypeId;
                List<PdfPreviewDataElement> dataElements = (instance.Data ?? [])
                    .Where(d => d.DataType == subformDataTypeId)
                    .Select(d => new PdfPreviewDataElement { Id = d.Id, DataType = d.DataType })
                    .ToList();

                tasks.Add(
                    new PdfPreviewTask
                    {
                        TaskId = processTask.Id,
                        Name = processTask.Name,
                        TaskType = AltinnTaskTypes.SubformPdf,
                        SubformComponentId = extension.SubformPdfConfiguration?.SubformComponentId,
                        SubformDataTypeId = subformDataTypeId,
                        DataElements = dataElements,
                    }
                );
            }
        }

        return Ok(new PdfPreviewTasksResponse { Tasks = tasks });
    }

    /// <summary>
    /// Get the pdf formatting
    /// </summary>
    /// <returns>The lists of pages/components to exclude from PDF</returns>
    [NonAction]
    public Task<ActionResult> GetPdfFormat(
        string org,
        string app,
        int instanceOwnerPartyId,
        Guid instanceGuid,
        Guid dataGuid
    ) => GetPdfFormat(org, app, instanceOwnerPartyId, instanceGuid, dataGuid, taskId: null, uiFolder: null);

    /// <summary>
    /// Get PDF formatting for the rendered task or subform UI folder.
    /// </summary>
    /// <remarks>
    /// The UI folder takes precedence over the task id for subforms. When neither is specified,
    /// formatting uses the instance's current task for compatibility with existing clients.
    /// </remarks>
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(string), StatusCodes.Status404NotFound, "text/plain")]
    [ProducesResponseType(typeof(string), StatusCodes.Status409Conflict, "text/plain")]
    [HttpGet("{org}/{app}/instances/{instanceOwnerPartyId:int}/{instanceGuid:guid}/data/{dataGuid}/pdf/format")]
    public async Task<ActionResult> GetPdfFormat(
        [FromRoute] string org,
        [FromRoute] string app,
        [FromRoute] int instanceOwnerPartyId,
        [FromRoute] Guid instanceGuid,
        [FromRoute] Guid dataGuid,
        [FromQuery] string? taskId = null,
        [FromQuery] string? uiFolder = null
    )
    {
        Instance instance = await _instanceClient.GetInstance(
            app,
            org,
            instanceOwnerPartyId,
            instanceGuid,
            authenticationMethod: null,
            CancellationToken.None
        );
        if (instance == null)
        {
            return NotFound("Did not find instance");
        }

        string? folderId = uiFolder ?? taskId ?? instance.Process?.CurrentTask?.ElementId;
        if (folderId == null)
        {
            return Conflict("Instance does not have a valid currentTask");
        }

        DataElement? dataElement = instance.Data.FirstOrDefault(d => d.Id == dataGuid.ToString());
        if (dataElement == null)
        {
            return NotFound("Did not find data element");
        }

        string appModelclassRef = _resources.GetClassRefForLogicDataType(dataElement.DataType);
        Type dataType = _appModel.GetModelType(appModelclassRef);

        var uiConfiguration = _resources.GetUiConfiguration();
        if (uiConfiguration is null)
        {
            return NotFound("Did not find ui configuration");
        }

        uiConfiguration.Folders.TryGetValue(folderId, out LayoutSettings? layoutSettings);
        if (layoutSettings is null && (taskId is not null || uiFolder is not null))
        {
            return NotFound($"Did not find UI folder '{folderId}'");
        }

        // Ensure layoutsettings are initialized in FormatPdf
        layoutSettings ??= new();
        layoutSettings.Pages ??= new();
        layoutSettings.Pages.ExcludeFromPdf ??= new();
        layoutSettings.Components ??= new();
        layoutSettings.Components.ExcludeFromPdf ??= new();

        object data = await _dataClient.GetFormData(
            instanceGuid,
            dataType,
            org,
            app,
            instanceOwnerPartyId,
            new Guid(dataElement.Id)
        );

        layoutSettings = await _pdfFormatter.FormatPdf(layoutSettings, data, instance);

        var result = new
        {
            ExcludedPages = layoutSettings?.Pages?.ExcludeFromPdf ?? new List<string>(),
            ExcludedComponents = layoutSettings?.Components?.ExcludeFromPdf ?? new List<string>(),
        };
        return Ok(result);
    }
}

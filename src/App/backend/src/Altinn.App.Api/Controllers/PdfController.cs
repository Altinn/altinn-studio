using Altinn.App.Api.Infrastructure.RateLimiting;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Pdf;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace Altinn.App.Api.Controllers;

/// <summary>
/// Handles PDF related operations
/// </summary>
[Authorize]
[ApiController]
public class PdfController : ControllerBase
{
    private readonly IInstanceClient _instanceClient;
    private readonly IPdfService _pdfService;
    private readonly IProcessReader _processReader;

    /// <summary>
    /// Initializes a new instance of the <see cref="PdfController"/> class.
    /// </summary>
    /// <param name="instanceClient">The instance client</param>
    /// <param name="pdfService">The PDF service</param>
    /// <param name="processReader">The process reader</param>
    public PdfController(IInstanceClient instanceClient, IPdfService pdfService, IProcessReader processReader)
    {
        _instanceClient = instanceClient;
        _pdfService = pdfService;
        _processReader = processReader;
    }

    /// <summary>
    /// Generate a preview of the PDF for the current task, or for a PDF or subform PDF service task in the process
    /// </summary>
    /// <param name="org">unique identifier of the organization responsible for the app</param>
    /// <param name="app">application identifier which is unique within an organization</param>
    /// <param name="instanceOwnerPartyId">unique id of the party that is the owner of the instance</param>
    /// <param name="instanceGuid">unique id to identify the instance</param>
    /// <param name="taskId">The PDF or subform PDF service task to preview, also one the instance has not reached yet. Defaults to the current task.</param>
    /// <param name="dataElementId">The subform data element to preview. Required when previewing a subform PDF service task.</param>
    /// <param name="language">The language of the preview, such as nb or en. Defaults to the user's language.</param>
    /// <param name="cancellationToken">Cancellation token, populated by the framework</param>
    [ProducesResponseType(typeof(FileContentResult), StatusCodes.Status200OK, "application/pdf")]
    [ProducesResponseType(typeof(string), StatusCodes.Status400BadRequest, "text/plain")]
    [ProducesResponseType(typeof(string), StatusCodes.Status404NotFound, "text/plain")]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(void), StatusCodes.Status429TooManyRequests)]
    [EnableRateLimiting(PdfPreviewRateLimiterPolicy.Name)]
    [HttpGet("{org}/{app}/instances/{instanceOwnerPartyId:int}/{instanceGuid:guid}/pdf/preview")]
    public async Task<ActionResult> GetPdfPreview(
        [FromRoute] string org,
        [FromRoute] string app,
        [FromRoute] int instanceOwnerPartyId,
        [FromRoute] Guid instanceGuid,
        [FromQuery] string? taskId = null,
        [FromQuery] Guid? dataElementId = null,
        [FromQuery] string? language = null,
        CancellationToken cancellationToken = default
    )
    {
        Instance instance = await _instanceClient.GetInstance(
            app,
            org,
            instanceOwnerPartyId,
            instanceGuid,
            authenticationMethod: null,
            cancellationToken
        );
        string? currentTaskId = instance.Process?.CurrentTask?.ElementId;
        if (currentTaskId == null)
        {
            return NotFound("Did not find instance or task");
        }

        if (taskId is null)
        {
            byte[] pdfContent = await _pdfService.GeneratePdf(
                instance,
                currentTaskId,
                language: language,
                isPreview: true,
                cancellationToken: cancellationToken
            );
            return File(pdfContent, "application/pdf");
        }

        if (_processReader.GetFlowElement(taskId) is not ProcessTask task)
        {
            return NotFound("Did not find task");
        }

        // Render the task the same way its PDF service task would
        AltinnTaskExtension? taskExtension = task.ExtensionElements?.TaskExtension;
        if (taskExtension?.TaskType == "pdf")
        {
            byte[] pdfPreview = await _pdfService.GeneratePdf(
                instance,
                taskId,
                taskExtension.PdfConfiguration?.AutoPdfTaskIds,
                language,
                isPreview: true,
                cancellationToken: cancellationToken
            );
            return File(pdfPreview, "application/pdf");
        }

        if (taskExtension?.TaskType != "subformPdf")
        {
            return BadRequest("taskId must identify a PDF or subform PDF service task");
        }

        // Like the service task, only render a subform of the configured data type
        ValidAltinnSubformPdfConfiguration subformConfig = (
            taskExtension.SubformPdfConfiguration
            ?? throw new ApplicationConfigException(
                "The subformPdfConfig node is missing in the subform pdf process task configuration."
            )
        ).Validate();
        string? subformId = dataElementId?.ToString();
        DataElement? subform = instance.Data.Find(element => element.Id == subformId);
        if (subform is null || subform.DataType != subformConfig.SubformDataTypeId)
        {
            return BadRequest(
                $"dataElementId must be the id of a data element of type {subformConfig.SubformDataTypeId}"
            );
        }

        byte[] subformPreview = await _pdfService.GenerateSubformPdf(
            instance,
            taskId,
            new SubformPdfContext(subformConfig.SubformComponentId, subform.Id),
            language,
            isPreview: true,
            cancellationToken: cancellationToken
        );
        return File(subformPreview, "application/pdf");
    }
}

using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Pdf;
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
    private readonly IPdfService _pdfService;

    /// <summary>
    /// Initializes a new instance of the <see cref="PdfController"/> class.
    /// </summary>
    /// <param name="instanceClient">The instance client</param>
    /// <param name="pdfService">The PDF service</param>
    public PdfController(IInstanceClient instanceClient, IPdfService pdfService)
    {
        _instanceClient = instanceClient;
        _pdfService = pdfService;
    }

    /// <summary>
    /// Generate a preview of the PDF for the current task
    /// </summary>
    [ProducesResponseType(typeof(FileStreamResult), StatusCodes.Status200OK, "application/pdf")]
    [ProducesResponseType(typeof(string), StatusCodes.Status404NotFound, "text/plain")]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ApiExplorerSettings(IgnoreApi = true)]
    [HttpGet("{org}/{app}/instances/{instanceOwnerPartyId:int}/{instanceGuid:guid}/pdf/preview")]
    public async Task<ActionResult> GetPdfPreview(
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
        string? taskId = instance.Process?.CurrentTask?.ElementId;
        if (instance == null || taskId == null)
        {
            return NotFound("Did not find instance or task");
        }

        Stream pdfContent = await _pdfService.GeneratePdf(
            instance,
            taskId,
            true,
            cancellationToken: CancellationToken.None
        );
        return new FileStreamResult(pdfContent, "application/pdf");
    }
}

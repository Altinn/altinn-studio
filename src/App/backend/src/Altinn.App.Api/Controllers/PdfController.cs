using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.AppModel;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Pdf;
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

    /// <summary>
    /// Initializes a new instance of the <see cref="PdfController"/> class.
    /// </summary>
    /// <param name="instanceClient">The instance client</param>
    /// <param name="pdfFormatter">The pdf formatter service</param>
    /// <param name="resources">The app resource service</param>
    /// <param name="appModel">The app model service</param>
    /// <param name="dataClient">The data client</param>
    /// <param name="pdfService">The PDF service</param>
    public PdfController(
        IInstanceClient instanceClient,
#pragma warning disable CS0618 // Type or member is obsolete
        IPdfFormatter pdfFormatter,
        IAppResources resources,
        IAppModel appModel,
        IDataClient dataClient,
        IPdfService pdfService
    )
    {
        _instanceClient = instanceClient;
        _pdfFormatter = pdfFormatter;
        _resources = resources;
        _appModel = appModel;
        _dataClient = dataClient;
        _pdfService = pdfService;
    }

    /// <summary>
    /// Generate a preview of the PDF for the current task
    /// </summary>
    [ProducesResponseType(typeof(FileStreamResult), StatusCodes.Status200OK, "application/pdf")]
    [ProducesResponseType(typeof(string), StatusCodes.Status404NotFound, "text/plain")]
    [ApiExplorerSettings(IgnoreApi = true)]
    [HttpGet("{org}/{app}/instances/{instanceOwnerPartyId:int}/{instanceGuid:guid}/pdf/preview")]
    public async Task<ActionResult> GetPdfPreview(
        [FromRoute] string org,
        [FromRoute] string app,
        [FromRoute] int instanceOwnerPartyId,
        [FromRoute] Guid instanceGuid
    )
    {
        var instance = await _instanceClient.GetInstance(app, org, instanceOwnerPartyId, instanceGuid);
        string? taskId = instance.Process?.CurrentTask?.ElementId;
        if (instance == null || taskId == null)
        {
            return NotFound("Did not find instance or task");
        }

        Stream pdfContent = await _pdfService.GeneratePdf(instance, taskId, true, CancellationToken.None);
        return new FileStreamResult(pdfContent, "application/pdf");
    }

    /// <summary>
    /// Get the pdf formatting
    /// </summary>
    /// <returns>The lists of pages/components to exclude from PDF</returns>
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(string), StatusCodes.Status404NotFound, "text/plain")]
    [ProducesResponseType(typeof(string), StatusCodes.Status409Conflict, "text/plain")]
    [HttpGet("{org}/{app}/instances/{instanceOwnerPartyId:int}/{instanceGuid:guid}/data/{dataGuid}/pdf/format")]
    public async Task<ActionResult> GetPdfFormat(
        [FromRoute] string org,
        [FromRoute] string app,
        [FromRoute] int instanceOwnerPartyId,
        [FromRoute] Guid instanceGuid,
        [FromRoute] Guid dataGuid
    )
    {
        Instance instance = await _instanceClient.GetInstance(app, org, instanceOwnerPartyId, instanceGuid);
        if (instance == null)
        {
            return NotFound("Did not find instance");
        }

        string? taskId = instance.Process?.CurrentTask?.ElementId;
        if (taskId == null)
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

        uiConfiguration.Folders.TryGetValue(taskId, out LayoutSettings? layoutSettings);

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

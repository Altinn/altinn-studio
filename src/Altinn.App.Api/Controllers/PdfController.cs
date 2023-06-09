#nullable enable

using System.Text.Json;
using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.AppModel;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.App.Api.Controllers
{
    /// <summary>
    /// Handles PDF related operations
    /// </summary>
    [Authorize]
    [ApiController]
    [Route("{org}/{app}/instances/{instanceOwnerPartyId:int}/{instanceGuid:guid}/data/{dataGuid:guid}/pdf")]
    public class PdfController : ControllerBase
    {
        private readonly IInstanceClient _instanceClient;
        private readonly IPdfFormatter _pdfFormatter;
        private readonly IAppResources _resources;
        private readonly IAppModel _appModel;
        private readonly IDataClient _dataClient;

        /// <summary>
        /// Initializes a new instance of the <see cref="PdfController"/> class.
        /// </summary>
        /// <param name="instanceClient">The instance client</param>
        /// <param name="pdfFormatter">The pdf formatter service</param>
        /// <param name="resources">The app resource service</param>
        /// <param name="appModel">The app model service</param>
        /// <param name="dataClient">The data client</param>
        public PdfController(
            IInstanceClient instanceClient,
            IPdfFormatter pdfFormatter,
            IAppResources resources,
            IAppModel appModel,
            IDataClient dataClient)
        {
            _instanceClient = instanceClient;
            _pdfFormatter = pdfFormatter;
            _resources = resources;
            _appModel = appModel;
            _dataClient = dataClient;
        }

        /// <summary>
        /// Get the pdf formatting
        /// </summary>
        /// <returns>The lists of pages/components to exclude from PDF</returns>
        [HttpGet("format")]
        public async Task<ActionResult> GetPdfFormat(
            [FromRoute] string org,
            [FromRoute] string app,
            [FromRoute] int instanceOwnerPartyId,
            [FromRoute] Guid instanceGuid,
            [FromRoute] Guid dataGuid)
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

            JsonSerializerOptions options = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

            string layoutSetsString = _resources.GetLayoutSets();
            LayoutSets? layoutSets = null;
            LayoutSet? layoutSet = null;
            if (!string.IsNullOrEmpty(layoutSetsString))
            {
                layoutSets = JsonSerializer.Deserialize<LayoutSets>(layoutSetsString, options)!;
                layoutSet = layoutSets.Sets?.FirstOrDefault(t => t.DataType.Equals(dataElement.DataType) && t.Tasks.Contains(taskId));
            }

            string? layoutSettingsFileContent = layoutSet == null ? _resources.GetLayoutSettingsString() : _resources.GetLayoutSettingsStringForSet(layoutSet.Id);

            LayoutSettings? layoutSettings = null;
            if (!string.IsNullOrEmpty(layoutSettingsFileContent))
            {
                layoutSettings = JsonSerializer.Deserialize<LayoutSettings>(layoutSettingsFileContent, options)!;
            }

            // Ensure layoutsettings are initialized in FormatPdf
            layoutSettings ??= new();
            layoutSettings.Pages ??= new();
            layoutSettings.Pages.ExcludeFromPdf ??= new();
            layoutSettings.Components ??= new();
            layoutSettings.Components.ExcludeFromPdf ??= new();

            object data = await _dataClient.GetFormData(instanceGuid, dataType, org, app, instanceOwnerPartyId, new Guid(dataElement.Id));

            layoutSettings = await _pdfFormatter.FormatPdf(layoutSettings, data, instance, layoutSet);

            var result = new
            {
                ExcludedPages = layoutSettings?.Pages?.ExcludeFromPdf ?? new List<string>(),
                ExcludedComponents = layoutSettings?.Components?.ExcludeFromPdf ?? new List<string>(),
            };
            return Ok(result);
        }
    }
}

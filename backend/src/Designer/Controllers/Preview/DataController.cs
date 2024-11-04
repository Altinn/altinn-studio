using System;
using System.Collections.Generic;
using System.Text.Json.Nodes;
using System.Threading;
using System.Threading.Tasks;
using System.Web;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Studio.Designer.Filters;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Preview;
using Altinn.Studio.Designer.Services.Implementation;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Services.Interfaces.Preview;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.Designer.Controllers.Preview
{
    [Authorize]
    [AutoValidateAntiforgeryToken]
    [Route("{org:regex(^(?!designer))}/{app:regex(^(?!datamodels$)[[a-z]][[a-z0-9-]]{{1,28}}[[a-z0-9]]$)}/instances/{partyId}/{instanceGuid}/data")]
    public class DataController(IHttpContextAccessor httpContextAccessor,
        IPreviewService previewService,
        ISchemaModelService schemaModelService,
        IDataService dataService
    ) : Controller
    {
        [HttpGet("{dataGuid}")]
        public ActionResult Get([FromRoute] Guid dataGuid)
        {
            JsonNode dataItem = dataService.GetDataElement(dataGuid);
            return Ok(dataItem);
        }

        [HttpPost]
        public ActionResult Post(
                [FromRoute] int partyId,
                [FromRoute] Guid instanceGuid,
                [FromQuery] string dataType
        )
        {
            DataElement dataElement = dataService.CreateDataElement(partyId, instanceGuid, dataType);
            return Created("link-to-app-placeholder", dataElement);
        }

        [HttpPatch("{dataGuid}")]
        [UseSystemTextJson]
        public ActionResult<DataPatchResponse> Patch(
                [FromRoute] Guid dataGuid,
                [FromBody] DataPatchRequest dataPatch
        )
        {
            JsonNode dataItem = dataService.PatchDataElement(dataGuid, dataPatch.Patch);
            return Ok(new DataPatchResponse()
            {
                ValidationIssues = [],
                NewDataModel = dataItem,
            });
        }

        [HttpDelete("{dataTypeId}")]
        public ActionResult DeleteAttachment([FromRoute] Guid dataGuid)
        {
            return Ok();
        }

        [HttpGet("{dataGuid}/validate")]
        public ActionResult ValidateInstanceForData([FromRoute] Guid dataGuid)
        {
            return Ok(new List<string>());
        }

        [HttpPost("{dataTypeId}/tags")]
        public ActionResult UpdateTagsForAttachment([FromBody] string tag)
        {
            return Created("link-to-app-placeholder", tag);
        }

        [HttpGet(PreviewService.MockDataTaskId)]
        public async Task<ActionResult> GetDefaultFormData(
                [FromRoute] string org,
                [FromRoute] string app,
                [FromRoute] int partyId,
                CancellationToken cancellationToken
        )
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(httpContextAccessor.HttpContext);
            string refererHeader = Request.Headers.Referer;
            string layoutSetName = GetSelectedLayoutSetInEditorFromRefererHeader(refererHeader);
            DataType dataType = await previewService.GetDataTypeForLayoutSetName(org, app, developer, layoutSetName, cancellationToken);
            // For apps that does not have a datamodel
            if (dataType == null)
            {
                Instance mockInstance = await previewService.GetMockInstance(org, app, developer, partyId, layoutSetName, cancellationToken);
                return Ok(mockInstance.Id);
            }
            string modelPath = $"/App/models/{dataType.Id}.schema.json";
            string decodedPath = Uri.UnescapeDataString(modelPath);
            string formData = await schemaModelService.GetSchema(AltinnRepoEditingContext.FromOrgRepoDeveloper(org, app, developer), decodedPath, cancellationToken);
            return Ok(formData);
        }

        [HttpPut(PreviewService.MockDataTaskId)]
        public async Task<ActionResult> UpdateFormData(
                [FromRoute] string org,
                [FromRoute] string app,
                [FromRoute] int partyId,
                CancellationToken cancellationToken
        )
        {
            return await GetDefaultFormData(org, app, partyId, cancellationToken);
        }

        [HttpPatch(PreviewService.MockDataTaskId)]
        public ActionResult PatchFormData()
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


using System;
using System.Collections.Generic;
using System.Text.Json.Nodes;
using System.Threading;
using System.Threading.Tasks;
using System.Web;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Studio.Designer.Constants;
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
    [Route("{org:regex(^(?!designer))}/{app:regex(^(?!datamodels$)[[a-z]][[a-z0-9-]]{{1,28}}[[a-z0-9]]$)}/instances")]
    public class DataController(IHttpContextAccessor httpContextAccessor,
        IPreviewService previewService,
        ISchemaModelService schemaModelService,
        IDataService dataService
    ) : Controller
    {
        [HttpGet]
        [Route("{partyId}/{instanceGuid}/data/{dataGuid}")]
        public ActionResult Get(string org, string app, [FromRoute] int partyId, [FromRoute] Guid instanceGuid, [FromRoute] Guid dataGuid, CancellationToken cancellationToken, [FromQuery] bool includeRowId = false, [FromQuery] string? language = null)
        {
            JsonNode dataItem = dataService.GetDataElement(org, app, partyId, instanceGuid, dataGuid, cancellationToken);
            return Ok(dataItem);
        }

        [HttpPost]
        [Route("{partyId}/{instanceGuid}/data")]
        public ActionResult Post(string org, string app, int partyId, Guid instanceGuid, [FromQuery] string dataType)
        {
            DataElement dataElement = dataService.CreateDataElement(org, app, partyId, instanceGuid, dataType);
            return Created("link-to-app-placeholder", dataElement);
        }

        [HttpPatch("{partyId}/{instanceGuid}/data/{dataGuid}")]
        [UseSystemTextJson]
        public ActionResult<DataPatchResponse> Patch(string org, string app, [FromRoute] int partyId, [FromRoute] Guid instanceGuid, [FromRoute] Guid dataGuid, [FromBody] DataPatchRequest dataPatch, CancellationToken cancellationToken)
        {
            if (instanceGuid == PreviewConstants.MockInstanceGUID && dataGuid == Guid.Empty)
            {
                return Ok();
            }

            JsonNode dataItem = dataService.PatchDataElement(org, app, partyId, instanceGuid, dataGuid, dataPatch.Patch, cancellationToken);
            return Ok(new DataPatchResponse()
            {
                ValidationIssues = [],
                NewDataModel = dataItem,
            });
        }

        /// <summary>
        /// Action for getting the json schema for the datamodel for the default data task test-datatask-id
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="partyId">party id</param>
        /// <param name="instanceGuid">instance</param>
        /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
        /// <returns>Json schema for datamodel for the current task</returns>
        [HttpGet]
        [Route("{partyId}/{instanceGuid}/data/" + PreviewService.MockDataTaskId)]
        public async Task<ActionResult> GetDefaultFormData(string org, string app, [FromRoute] int partyId, [FromRoute] string instanceGuid, CancellationToken cancellationToken)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(httpContextAccessor.HttpContext);
            string refererHeader = Request.Headers["Referer"];
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

        /// <summary>
        /// Action for updating the json schema for the datamodel for the current data task in the process
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="partyId"></param>
        /// <param name="instanceGuid"></param>
        /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
        /// <returns>Json schema for datamodel for the current data task in the process</returns>
        [HttpPut]
        [Route("{partyId}/{instanceGuid}/data/" + PreviewService.MockDataTaskId)]
        public async Task<ActionResult> UpdateFormData(string org, string app, [FromRoute] int partyId, [FromRoute] string instanceGuid, CancellationToken cancellationToken)
        {
            return await GetDefaultFormData(org, app, partyId, instanceGuid, cancellationToken);
        }

        /// <summary>
        /// Action for mocking deleting an uploaded attachment to an attachment component
        /// </summary>
        /// <param name="dataTypeId">Id of the attachment in application metadata</param>
        /// <returns>Ok</returns>
        [HttpDelete]
        [Route("{partyId}/{instanceGuid}/data/{dataTypeId}")]
        public ActionResult DeleteAttachment([FromRoute] string dataTypeId)
        {
            return Ok();
        }

        [HttpGet]
        [Route("{partyId}/{instanceGuid}/data/{dataGuid}/validate")]
        public ActionResult ValidateInstanceForData([FromRoute] Guid dataGuid)
        {
            return Ok(new List<string>());
        }

        /// <summary>
        /// Action for mocking updating tags for an attachment component in the datamodel
        /// </summary>
        /// <param name="tag">The specific tag from the code list chosen for the attachment</param>
        /// <returns>Ok</returns>
        [HttpPost]
        [Route("{partyId}/{instanceGuid}/data/{dataTypeId}/tags")]
        public ActionResult UpdateTagsForAttachment([FromBody] string tag)
        {
            return Created("link-to-app-placeholder", tag);
        }

        private static string GetSelectedLayoutSetInEditorFromRefererHeader(string refererHeader)
        {
            Uri refererUri = new(refererHeader);
            string layoutSetName = HttpUtility.ParseQueryString(refererUri.Query)["selectedLayoutSet"];

            return string.IsNullOrEmpty(layoutSetName) ? null : layoutSetName;
        }
    }
}


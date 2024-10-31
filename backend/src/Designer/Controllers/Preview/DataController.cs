using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using System.Web;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Implementation;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Distributed;

namespace Altinn.Studio.Designer.Controllers.Preview
{
    [Authorize]
    [AutoValidateAntiforgeryToken]
    [Route("{org:regex(^(?!designer))}/{app:regex(^(?!datamodels$)[[a-z]][[a-z0-9-]]{{1,28}}[[a-z0-9]]$)}")]
    public class DataController(IHttpContextAccessor httpContextAccessor,
        IDistributedCache distributedCache,
        IPreviewService previewService,
        ISchemaModelService schemaModelService
    ) : Controller
    {

        /// <summary>
        /// Endpoint to validate a data task for an instance
        /// </summary>
        /// <returns>Ok</returns>
        [HttpGet]
        [Route("instances/{partyId}/{instanceGuId}/data/" + PreviewService.MockDataTaskId + "/validate")]
        public ActionResult ValidateInstanceForDataTask()
        {
            return Ok(new List<string>());
        }

        [HttpGet]
        [Route("instances/{partyId}/{instanceGuId}/data/{dataGuid}/validate")]
        public ActionResult ValidateInstanceForData([FromRoute] Guid dataGuid)
        {
            string dataTypeId = distributedCache.GetString(dataGuid.ToString());
            Console.WriteLine("Validating data element instance: " + dataGuid + " with data type: " + dataTypeId);
            return Ok(new List<string>());
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
        [Route("instances/{partyId}/{instanceGuid}/data/" + PreviewService.MockDataTaskId)]
        public async Task<ActionResult> GetFormData(string org, string app, [FromRoute] int partyId, [FromRoute] string instanceGuid, CancellationToken cancellationToken)
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

        [HttpGet]
        [Route("instances/{partyId}/{instanceGuid}/data/{dataGuid}")]
        public async Task<ActionResult> GetData(string org, string app, [FromRoute] int partyId, [FromRoute] Guid instanceGuid, [FromRoute] Guid dataGuid, CancellationToken cancellationToken, [FromQuery] bool includeRowId = false, [FromQuery] string? language = null)
        {
            string dataTypeId = distributedCache.GetString(dataGuid.ToString());
            Console.WriteLine("Getting dataType for instanceGuid " + dataGuid + ": " + dataTypeId);
            string modelPath = $"/App/models/{dataTypeId}.schema.json";
            string decodedPath = Uri.UnescapeDataString(modelPath);
            string developer = AuthenticationHelper.GetDeveloperUserName(httpContextAccessor.HttpContext);
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
        [Route("instances/{partyId}/{instanceGuid}/data/" + PreviewService.MockDataTaskId)]
        public async Task<ActionResult> UpdateFormData(string org, string app, [FromRoute] int partyId, [FromRoute] string instanceGuid, CancellationToken cancellationToken)
        {
            return await GetFormData(org, app, partyId, instanceGuid, cancellationToken);
        }

        /// <summary>
        /// Action for mocking upload of an attachment to an attachment component
        /// </summary>
        /// <param name="dataType">Id of the attachment component in application metadata</param>
        /// <returns>A 201 Created response with a mocked data element</returns>
        [HttpPost]
        [Route("instances/{partyId}/{instanceGuid}/data")]
        public ActionResult PostAttachment([FromQuery] string dataType)
        {
            Guid guid = Guid.NewGuid();
            Console.WriteLine("Setting data element instance: " + guid + " to data type: " + dataType);
            distributedCache.SetString(guid.ToString(), dataType);

            // This guid will be the unique id of the uploaded attachment
            DataElement dataElement = new() { Id = guid.ToString() };
            return Created("link-to-app-placeholder", dataElement);
        }

        /// <summary>
        /// Action for mocking deleting an uploaded attachment to an attachment component
        /// </summary>
        /// <param name="dataTypeId">Id of the attachment in application metadata</param>
        /// <returns>Ok</returns>
        [HttpDelete]
        [Route("instances/{partyId}/{instanceGuid}/data/{dataTypeId}")]
        public ActionResult DeleteAttachment([FromRoute] string dataTypeId)
        {
            return Ok();
        }

        /// <summary>
        /// Action for mocking updating tags for an attachment component in the datamodel
        /// </summary>
        /// <param name="tag">The specific tag from the code list chosen for the attachment</param>
        /// <returns>Ok</returns>
        [HttpPost]
        [Route("instances/{partyId}/{instanceGuid}/data/{dataTypeId}/tags")]
        public ActionResult UpdateTagsForAttachment([FromBody] string tag)
        {
            return Created("link-to-app-placeholder", tag);
        }


        /// <summary>
        /// Action for getting a response from v1/data/anonymous
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>Empty object</returns>
        [HttpGet]
        [Route("api/v1/data/anonymous")]
        public IActionResult Anonymous(string org, string app)
        {
            string user = "{}";
            return Content(user);
        }

        private static string GetSelectedLayoutSetInEditorFromRefererHeader(string refererHeader)
        {
            Uri refererUri = new(refererHeader);
            string layoutSetName = HttpUtility.ParseQueryString(refererUri.Query)["selectedLayoutSet"];

            return string.IsNullOrEmpty(layoutSetName) ? null : layoutSetName;
        }
    }
}


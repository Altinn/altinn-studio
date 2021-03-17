using System;
using System.Collections.Generic;
using System.Threading.Tasks;

using Altinn.App.Common.Serialization;
using Altinn.App.Services.Interface;
using Altinn.Platform.Storage.Interface.Models;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace Altinn.App.Api.Controllers
{
    /// <summary>
    /// Handles page related operations
    /// </summary>
    [Authorize]
    [ApiController]
    [Route("{org}/{app}/instances/{instanceOwnerPartyId:int}/{instanceGuid:guid}/pages")]
    public class PagesController : ControllerBase
    {
        private readonly IAltinnApp _altinnApp;
        private readonly IAppResources _resources;
        private readonly ILogger _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="PagesController"/> class.
        /// </summary>
        /// <param name="altinnApp">The current App Core used to interface with custom logic</param>
        /// <param name="resources">The app resource service</param>
        public PagesController(IAltinnApp altinnApp, IAppResources resources, ILogger<PagesController> logger)
        {
            _altinnApp = altinnApp;
            _resources = resources;
            _logger = logger;
        }

        /// <summary>
        /// Get the page order based on the current state of the instance
        /// </summary>
        /// <returns>The pages sorted in the correct order</returns>
        [HttpPost("order")]
        public async Task<ActionResult<List<string>>> GetPageOrder(
            [FromRoute] string org,
            [FromRoute] string app,
            [FromRoute] int instanceOwnerPartyId,
            [FromRoute] Guid instanceGuid,
            [FromQuery] string layoutSetId,
            [FromQuery] string currentPage,
            [FromQuery] string dataTypeId,
            [FromBody] dynamic formData)
        {
            if (string.IsNullOrEmpty(dataTypeId))
            {
                return BadRequest("Query parameter `dataTypeId` must be defined");
            }

            string classRef = _resources.GetClassRefForLogicDataType(dataTypeId);

            object data = JsonConvert.DeserializeObject(formData.ToString(), _altinnApp.GetAppModelType(classRef));
            return await _altinnApp.GetPageOrder(org, app, instanceOwnerPartyId, instanceGuid, layoutSetId, currentPage, dataTypeId, data);
        }
    }
}

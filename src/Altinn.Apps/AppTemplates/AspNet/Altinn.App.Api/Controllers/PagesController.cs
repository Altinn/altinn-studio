using System;
using System.Collections.Generic;
using System.Threading.Tasks;

using Altinn.App.Services.Interface;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

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

        /// <summary>
        /// Initializes a new instance of the <see cref="PagesController"/> class.
        /// </summary>
        /// <param name="altinnApp">The current App Core used to interface with custom logic</param>
        public PagesController(IAltinnApp altinnApp)
        {
            _altinnApp = altinnApp;
        }

        /// <summary>
        /// Get the page order based on the current state of the instance
        /// </summary>
        /// <returns>The pages sorted in the correct order</returns>
        [HttpGet("order")]
        public async Task<List<string>> GetPageOrder(
            [FromRoute] string org,
            [FromRoute] string app,
            [FromRoute] int instanceOwnerPartyId,
            [FromRoute] Guid instanceGuid,
            [FromQuery] string layoutSetId,
            [FromQuery] string currentPage,
            [FromQuery] string dataTypeId)
        {
            return await _altinnApp.GetPageOrder(org, app, instanceOwnerPartyId, instanceGuid, layoutSetId, currentPage, dataTypeId);
        }
    }
}

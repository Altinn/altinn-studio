using System;
using System.Collections.Generic;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Studio.Designer.Filters;
using Altinn.Studio.Designer.Models.Preview;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;

namespace Altinn.Studio.Designer.Controllers.Preview.V3
{
    [Authorize]
    [AutoValidateAntiforgeryToken]
    [Route("{org:regex(^(?!designer|editor|dashboard|preview|admin|resourceadm|info))}/{app:regex(^(?!datamodels$)[[a-z]][[a-z0-9-]]{{1,28}}[[a-z0-9]]$)}/v3/instances/{partyId}/{instanceGuid}/data")]
    public class OldDataController(
    ) : Controller
    {

        [HttpGet("{dataGuid}")]
        [UseSystemTextJson]
        public ActionResult Get(
                [FromRoute] string partyId,
                [FromRoute] string instanceGuid
        )
        {
            return Ok(partyId + "/" + instanceGuid);
        }

        [HttpPost]
        [UseSystemTextJson]
        public ActionResult<DataElement> Post(
                [FromRoute] int partyId,
                [FromRoute] Guid instanceGuid,
                [FromQuery] string dataType
        )
        {
            return Created("link-to-app-placeholder", "{}");
        }

        [HttpDelete("{dataGuid}")]
        public ActionResult<DataPostResponse> Delete(
                [FromRoute] Guid instanceGuid,
                [FromRoute] Guid dataGuid
        )
        {
            return Ok();
        }

        [HttpGet("{dataGuid}/validate")]
        public ActionResult ValidateInstanceForData(
                [FromRoute] Guid dataGuid
        )
        {
            return Ok(new List<string>());
        }

        [HttpPost("{dataGuid}/tags")]
        public ActionResult UpdateTagsForAttachment(
                [FromBody] string tag
        )
        {
            return Created("link-to-app-placeholder", tag);
        }
    }
}

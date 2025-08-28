using System;
using System.Collections.Generic;
using System.Text.Json.Nodes;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Studio.Designer.Filters;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Infrastructure.GitRepository;
using Altinn.Studio.Designer.Models.Preview;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Services.Interfaces.Preview;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Routing;

namespace Altinn.Studio.Designer.Controllers.Preview
{
    [ApiController]
    [Authorize]
    [AutoValidateAntiforgeryToken]
    [Route("{org:regex(^(?!designer|editor|dashboard|preview|resourceadm|info))}/{app:regex(^(?!datamodels$)[[a-z]][[a-z0-9-]]{{1,28}}[[a-z0-9]]$)}/instances/{partyId}/{instanceGuid}/data")]
    public class DataController(
        IInstanceService instanceService,
        IDataService dataService,
        IAltinnGitRepositoryFactory altinnGitRepositoryFactory

    ) : Controller
    {
        // <summary>
        // Redirect requests from older versions of Studio to old controller
        // </summary>
        public override void OnActionExecuting(ActionExecutingContext context)
        {
            string org = context.RouteData.Values["org"] as string;
            string app = context.RouteData.Values["app"] as string;
            string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
            AltinnAppGitRepository altinnAppGitRepository = altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, app, developer);
            if (!altinnAppGitRepository.AppUsesLayoutSets())
            {
                RouteValueDictionary routeData = context.RouteData.Values;
                foreach (var queryParam in context.HttpContext.Request.Query)
                {
                    routeData[queryParam.Key] = queryParam.Value.ToString();
                }
                context.Result = base.RedirectToActionPreserveMethod(controllerName: "OldData", routeValues: routeData);
            }
            base.OnActionExecuting(context);
        }

        [HttpGet("{dataGuid}")]
        [UseSystemTextJson]
        public ActionResult Get(
                [FromRoute] Guid dataGuid
        )
        {
            JsonNode dataItem = dataService.GetDataElement(dataGuid);
            return Ok(dataItem);
        }

        [HttpPost]
        [UseSystemTextJson]
        public ActionResult<DataElement> Post(
                [FromRoute] int partyId,
                [FromRoute] Guid instanceGuid,
                [FromQuery] string dataType
        )
        {
            DataElement dataElement = dataService.CreateDataElement(partyId, instanceGuid, dataType);
            instanceService.AddDataElement(instanceGuid, dataElement);
            return Created("link-to-app-placeholder", dataElement);
        }

        [HttpPatch]
        [UseSystemTextJson]
        public ActionResult<DataPatchResponseMultiple> PatchMultiple(
                [FromRoute] string org,
                [FromRoute] string app,
                [FromRoute] int partyId,
                [FromRoute] Guid instanceGuid,
                [FromBody] DataPatchRequestMultiple dataPatch
        )
        {
            Instance instance = instanceService.GetInstance(instanceGuid);

            List<DataModelPairResponse> newDataModels = [];
            dataPatch.Patches.ForEach(patch =>
            {
                JsonNode dataItem = dataService.PatchDataElement(patch.DataElementId, patch.Patch);
                newDataModels.Add(new DataModelPairResponse(patch.DataElementId, dataItem));
            });

            return Ok(new DataPatchResponseMultiple()
            {
                ValidationIssues = [],
                NewDataModels = newDataModels,
                Instance = instance,
            });
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

        [HttpDelete("{dataGuid}")]
        public ActionResult<DataPostResponse> Delete(
                [FromRoute] Guid instanceGuid,
                [FromRoute] Guid dataGuid
        )
        {
            instanceService.RemoveDataElement(instanceGuid, dataGuid);
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

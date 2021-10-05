using System;
using System.Linq;
using System.Net.Mime;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

using Altinn.App.Api.Filters;
using Altinn.App.Api.Models;
using Altinn.App.Common.Constants;
using Altinn.App.Services.Interface;

using Altinn.Platform.Storage.Interface.Models;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.App.Api.Controllers
{
    /// <summary>
    /// This controller class provides action methods for endpoints related to the tags resource on data elements.
    /// </summary>
    [AutoValidateAntiforgeryTokenIfAuthCookie]
    [Produces(MediaTypeNames.Application.Json)]
    [Consumes(MediaTypeNames.Application.Json)]
    [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
    [Route("{org}/{app}/instances/{instanceOwnerPartyId:int}/{instanceGuid:guid}/data/{dataGuid:guid}/tags")]
    public class DataTagsController : ControllerBase
    {
        private readonly IInstance _instanceClient;
        private readonly IData _dataClient;

        /// <summary>
        /// Initialize a new instance of <see cref="DataTagsController"/> with the given services.
        /// </summary>
        /// <param name="instanceClient">A client that can be used to send instance requests to storage.</param>
        /// <param name="dataClient">A client that can be used to send data requests to storage.</param>
        public DataTagsController(
            IInstance instanceClient,
            IData dataClient)
        {
            _instanceClient = instanceClient;
            _dataClient = dataClient;
        }

        /// <summary>
        /// Retrieves all tags associated with the given data element.
        /// </summary>
        /// <param name="org">The short name for the application owner.</param>
        /// <param name="app">The name of the application.</param>
        /// <param name="instanceOwnerPartyId">The party id of the owner of the instance.</param>
        /// <param name="instanceGuid">The id of the instance.</param>
        /// <param name="dataGuid">The id of the data element.</param>
        /// <returns>A <see cref="TagsList"/> object with a list of tags.</returns>
        [HttpGet]
        [Authorize(Policy = AuthzConstants.POLICY_INSTANCE_READ)]
        [ProducesResponseType(typeof(TagsList), StatusCodes.Status200OK)]
        public async Task<ActionResult<TagsList>> Get(
            [FromRoute] string org,
            [FromRoute] string app,
            [FromRoute] int instanceOwnerPartyId,
            [FromRoute] Guid instanceGuid,
            [FromRoute] Guid dataGuid)
        {
            Instance instance = await _instanceClient.GetInstance(app, org, instanceOwnerPartyId, instanceGuid);
            if (instance == null)
            {
                return NotFound($"Unable to find instance based on the given parameters.");
            }

            DataElement dataElement = instance.Data.FirstOrDefault(m => m.Id.Equals(dataGuid.ToString()));

            if (dataElement == null)
            {
                return NotFound("Unable to find data element based on the given parameters.");
            }

            TagsList tagsList = new TagsList
            {
                Tags = dataElement.Tags
            };

            return tagsList;
        }

        /// <summary>
        /// Adds a new tag to a <see cref="DataElement"/>.
        /// </summary>
        /// <param name="org">The short name for the application owner.</param>
        /// <param name="app">The name of the application.</param>
        /// <param name="instanceOwnerPartyId">The party id of the owner of the instance.</param>
        /// <param name="instanceGuid">The id of the instance.</param>
        /// <param name="dataGuid">The id of the data element.</param>
        /// <param name="tag">The new tag to be added.</param>
        /// <returns>A <see cref="TagsList"/> object with a list of tags.</returns>
        [HttpPost]
        [Authorize(Policy = AuthzConstants.POLICY_INSTANCE_WRITE)]
        [ProducesResponseType(typeof(TagsList), StatusCodes.Status201Created)]
        public async Task<ActionResult<TagsList>> Add(
            [FromRoute] string org,
            [FromRoute] string app,
            [FromRoute] int instanceOwnerPartyId,
            [FromRoute] Guid instanceGuid,
            [FromRoute] Guid dataGuid,
            [FromBody] string tag)
        {
            if (tag == null || !Regex.Match(tag, "^[\\p{L}\\-_]+$").Success)
            {
                return BadRequest("The new tag must consist of letters.");
            }

            Instance instance = await _instanceClient.GetInstance(app, org, instanceOwnerPartyId, instanceGuid);
            if (instance == null)
            {
                return NotFound("Unable to find instance based on the given parameters.");
            }

            DataElement dataElement = instance.Data.FirstOrDefault(m => m.Id.Equals(dataGuid.ToString()));
            
            if (dataElement == null)
            {
                return NotFound("Unable to find data element based on the given parameters.");
            }

            if (!dataElement.Tags.Contains(tag))
            {
                dataElement.Tags.Add(tag);
                dataElement = await _dataClient.Update(instance, dataElement);
            }

            TagsList tagsList = new TagsList
            {
                Tags = dataElement.Tags
            };

            return tagsList;
        }

        /// <summary>
        /// Removes a tag from a <see cref="DataElement"/>.
        /// </summary>
        /// <param name="org">The short name for the application owner.</param>
        /// <param name="app">The name of the application.</param>
        /// <param name="instanceOwnerPartyId">The party id of the owner of the instance.</param>
        /// <param name="instanceGuid">The id of the instance.</param>
        /// <param name="dataGuid">The id of the data element.</param>
        /// <param name="tag">The name of the tag to be removed.</param>
        [HttpDelete("{tag}")]
        [Authorize(Policy = AuthzConstants.POLICY_INSTANCE_WRITE)]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        public async Task<ActionResult> Delete(
            [FromRoute] string org,
            [FromRoute] string app,
            [FromRoute] int instanceOwnerPartyId,
            [FromRoute] Guid instanceGuid,
            [FromRoute] Guid dataGuid,
            [FromRoute] string tag)
        {
            Instance instance = await _instanceClient.GetInstance(app, org, instanceOwnerPartyId, instanceGuid);
            if (instance == null)
            {
                return NotFound("Unable to find instance based on the given parameters.");
            }

            DataElement dataElement = instance.Data.FirstOrDefault(m => m.Id.Equals(dataGuid.ToString()));

            if (dataElement == null)
            {
                return NotFound("Unable to find data element based on the given parameters.");
            }

            if (dataElement.Tags.Contains(tag))
            {
                dataElement.Tags.Remove(tag);
                await _dataClient.Update(instance, dataElement);
            }

            return NoContent();
        }
    }
}

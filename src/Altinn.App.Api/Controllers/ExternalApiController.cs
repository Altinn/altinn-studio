using Altinn.App.Core.Constants;
using Altinn.App.Core.Features.ExternalApi;
using Altinn.App.Core.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.App.Api.Controllers;

/// <summary>
/// Represents the External API Controller.
/// </summary>
[Route("{org}/{app}/instances/{instanceOwnerPartyId:int}/{instanceGuid:guid}/api/external")]
[ApiController]
public class ExternalApiController : ControllerBase
{
    private readonly ILogger<ExternalApiController> _logger;
    private readonly IExternalApiService _externalApiService;

    /// <summary>
    /// Creates a new instance of the <see cref="ExternalApiController"/> class
    /// </summary>
    public ExternalApiController(ILogger<ExternalApiController> logger, IExternalApiService externalApiService)
    {
        _logger = logger;
        _externalApiService = externalApiService;
    }

    /// <summary>
    /// Get the data for a specific implementation of an external api, identified by externalApiId
    /// </summary>
    /// <param name="instanceOwnerPartyId">The instance owner party id</param>
    /// <param name="instanceGuid">The instance guid</param>
    /// <param name="externalApiId">The id of the external api</param>
    /// <param name="queryParams">The query parameters to pass to the external api endpoint</param>
    /// <returns>The data for the external api</returns>
    [HttpGet]
    [Authorize(Policy = AuthzConstants.POLICY_INSTANCE_READ)]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(string), StatusCodes.Status400BadRequest, "text/plain")]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(string), StatusCodes.Status500InternalServerError, "text/plain")]
    [Route("{externalApiId}")]
    public async Task<IActionResult> Get(
        [FromRoute] int instanceOwnerPartyId,
        [FromRoute] Guid instanceGuid,
        [FromRoute] string externalApiId,
        [FromQuery] Dictionary<string, string> queryParams
    )
    {
        var instanceIdentifier = new InstanceIdentifier(instanceOwnerPartyId, instanceGuid);
        try
        {
            var (externalApiData, wasExternalApiFound) = await _externalApiService.GetExternalApiData(
                externalApiId,
                instanceIdentifier,
                queryParams
            );

            if (!wasExternalApiFound)
            {
                _logger.LogWarning("External api with id '{ExternalApiId}' not found.", externalApiId);
                return BadRequest($"External api with id '{externalApiId}' not found.");
            }

            return Ok(externalApiData);
        }
        catch (Exception ex)
        {
            const string genericErrorDescription = "An error occurred when calling external api";
            _logger.LogError(ex, genericErrorDescription);

            if (ex is HttpRequestException { StatusCode: not null } httpEx)
            {
                var errorMessage = !string.IsNullOrWhiteSpace(ex.Message) ? ex.Message : genericErrorDescription;
                return StatusCode((int)httpEx.StatusCode.Value, errorMessage);
            }

            return StatusCode(StatusCodes.Status500InternalServerError, $"{genericErrorDescription}: {ex.Message}");
        }
    }
}

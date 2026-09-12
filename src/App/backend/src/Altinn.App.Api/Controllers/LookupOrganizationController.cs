using System.Net.Mime;
using Altinn.App.Api.Infrastructure.Filters;
using Altinn.App.Api.Models;
using Altinn.App.Core.Internal.Registers;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Result;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.App.Api.Controllers;

/// <summary>
/// This controller class provides Enhetsregisteret (ER) organization lookup functionality.
/// </summary>
[AutoValidateAntiforgeryTokenIfAuthCookie]
[ApiController]
[Produces(MediaTypeNames.Application.Json)]
[Consumes(MediaTypeNames.Application.Json)]
[Route("{org}/{app}/api/v1/lookup/organisation")]
public class LookupOrganizationController : ControllerBase
{
    private readonly IOrganizationClient _organizationClient;
    private readonly ILogger<LookupOrganizationController> _logger;

    /// <summary>
    /// Initialize a new instance of <see cref="LookupOrganizationController"/> with the given services.
    /// </summary>
    /// <param name="organizationClient">A client for an organization lookup in ER.</param>
    /// <param name="logger">A logger for logging.</param>
    public LookupOrganizationController(
        IOrganizationClient organizationClient,
        ILogger<LookupOrganizationController> logger
    )
    {
        _organizationClient = organizationClient;
        _logger = logger;
    }

    /// <summary>
    /// Allows an organization lookup by orgNr in ER
    /// </summary>
    /// <param name="orgNr">Route param that contains the orgNr to look up in ER.</param>
    /// <returns>A <see cref="LookupOrganizationResponse"/> object.</returns>
    [HttpGet]
    [Route("{orgNr}")]
    [ProducesResponseType(typeof(LookupOrganizationResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<LookupOrganizationResponse>> LookUpOrganization([FromRoute] string orgNr)
    {
        var organizationResult = await GetOrganizationDataOrError(orgNr);
        if (!organizationResult.Success)
        {
            ProblemDetails problemDetails = organizationResult.Error;
            return StatusCode(problemDetails.Status ?? 500, problemDetails);
        }

        return Ok(LookupOrganizationResponse.CreateFromOrganization(organizationResult.Ok));
    }

    private async Task<ServiceResult<Organization?, ProblemDetails>> GetOrganizationDataOrError(string orgNr)
    {
        try
        {
            return await _organizationClient.GetOrganization(orgNr);
        }
        catch (Exception e)
        {
            _logger.LogError(e, "Error when calling the Organization Register API.");
            return new ProblemDetails
            {
                Title = "Error when calling register",
                Detail = "Something went wrong when calling the Organization Register API.",
                Status = StatusCodes.Status500InternalServerError,
            };
        }
    }
}

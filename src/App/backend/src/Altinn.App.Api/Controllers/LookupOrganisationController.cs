using System.Net.Mime;
using Altinn.App.Api.Infrastructure.Filters;
using Altinn.App.Api.Models;
using Altinn.App.Core.Internal.Registers;
using Altinn.App.Core.Models.Result;
using Altinn.Platform.Register.Models;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.App.Api.Controllers;

/// <summary>
/// This controller class provides Enhetsregisteret (ER) organisation lookup functionality.
/// </summary>
[AutoValidateAntiforgeryTokenIfAuthCookie]
[ApiController]
[Produces(MediaTypeNames.Application.Json)]
[Consumes(MediaTypeNames.Application.Json)]
[Route("{org}/{app}/api/v1/lookup/organisation")]
public class LookupOrganisationController : ControllerBase
{
    private readonly IOrganizationClient _organisationClient;
    private readonly ILogger<LookupOrganisationController> _logger;

    /// <summary>
    /// Initialize a new instance of <see cref="LookupOrganisationController"/> with the given services.
    /// </summary>
    /// <param name="organisationClient">A client for an organisation lookup in ER.</param>
    /// <param name="logger">A logger for logging.</param>
    public LookupOrganisationController(
        IOrganizationClient organisationClient,
        ILogger<LookupOrganisationController> logger
    )
    {
        _organisationClient = organisationClient;
        _logger = logger;
    }

    /// <summary>
    /// Allows an organisation lookup by orgNr in ER
    /// </summary>
    /// <param name="orgNr">Route param that contains the orgNr to look up in ER.</param>
    /// <returns>A <see cref="LookupOrganisationResponse"/> object.</returns>
    [HttpGet]
    [Route("{orgNr}")]
    [ProducesResponseType(typeof(LookupOrganisationResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<LookupOrganisationResponse>> LookUpOrganisation([FromRoute] string orgNr)
    {
        var organisationResult = await GetOrganisationDataOrError(orgNr);
        if (!organisationResult.Success)
        {
            ProblemDetails problemDetails = organisationResult.Error;
            return StatusCode(problemDetails.Status ?? 500, problemDetails);
        }

        return Ok(LookupOrganisationResponse.CreateFromOrganisation(organisationResult.Ok));
    }

    private async Task<ServiceResult<Organization?, ProblemDetails>> GetOrganisationDataOrError(string orgNr)
    {
        try
        {
            return await _organisationClient.GetOrganization(orgNr);
        }
        catch (Exception e)
        {
            _logger.LogError(e, "Error when calling the Organisation Register API.");
            return new ProblemDetails
            {
                Title = "Error when calling register",
                Detail = "Something went wrong when calling the Organisation Register API.",
                Status = StatusCodes.Status500InternalServerError,
            };
        }
    }
}

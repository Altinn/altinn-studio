#nullable enable
using Microsoft.AspNetCore.Mvc;
using LocalTest.Models.Authentication;
using LocalTest.Services.Authentication.Implementation;

namespace LocalTest.Controllers;

[Route("Home/auth")]
[ApiController]
public class TestAuthenticationController : ControllerBase
{
    private readonly ILogger<TestAuthenticationController> _logger;
    private readonly TestAuthenticationService _testAuthenticationService;

    public TestAuthenticationController(ILogger<TestAuthenticationController> logger, TestAuthenticationService testAuthenticationService)
    {
        _logger = logger;
        _testAuthenticationService = testAuthenticationService;
    }

    /// <summary>
    /// Generate a token for a regular user (Person with BankID authentication)
    /// </summary>
    /// <param name="userId">User ID (if not provided, uses first user from test data)</param>
    /// <param name="partyId">Party ID (if not provided, uses first user from test data)</param>
    /// <param name="authenticationLevel">Authentication level (default: 2)</param>
    /// <param name="scope">Token scope (default: altinn:portal/enduser)</param>
    /// <returns>JWT token</returns>
    [HttpGet("user")]
    public async Task<ActionResult> GetUserToken(
        [FromQuery] int? userId = null,
        [FromQuery] int? partyId = null,
        [FromQuery] int authenticationLevel = 2,
        [FromQuery] string? scope = null
    )
    {
        try
        {
            string token = await _testAuthenticationService.GetUserToken(userId, partyId, authenticationLevel, scope);
            return Ok(token);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to generate user token");
            return Problem(
                detail: ex.Message,
                title: "Failed to generate user token",
                statusCode: 400
            );
        }
    }

    /// <summary>
    /// Generate a token for a self-identified user (login without SSN/D-number)
    /// </summary>
    /// <param name="username">Username (required) - must match a username in test data</param>
    /// <param name="scope">Token scope (default: altinn:portal/enduser)</param>
    /// <returns>JWT token</returns>
    [HttpGet("selfidentifieduser")]
    public async Task<ActionResult> GetSelfIdentifiedUserToken(
        [FromQuery] string username,
        [FromQuery] string? scope = null
    )
    {
        try
        {
            string token = await _testAuthenticationService.GetSelfIdentifiedUserToken(username, scope);
            return Ok(token);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to generate self-identified user token");
            return Problem(
                detail: ex.Message,
                title: "Failed to generate self-identified user token",
                statusCode: 400
            );
        }
    }

    /// <summary>
    /// Generate a token for an organization (Maskinporten token without service owner scopes)
    /// </summary>
    /// <param name="orgNumber">Organization number (if not provided, uses first org from test data)</param>
    /// <param name="scope">Space-separated scopes (default: "altinn:instances.read altinn:instances.write")</param>
    /// <returns>JWT token</returns>
    [HttpGet("org")]
    public async Task<ActionResult> GetOrgToken(
        [FromQuery] string? orgNumber = null,
        [FromQuery] string? scope = null
    )
    {
        try
        {
            string token = await _testAuthenticationService.GetOrgToken(orgNumber, scope ?? TestAuthenticationService.DefaultOrgScope);
            return Ok(token);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to generate org token");
            return Problem(
                detail: ex.Message,
                title: "Failed to generate org token",
                statusCode: 400
            );
        }
    }

    /// <summary>
    /// Generate a token for a service owner (Maskinporten token with service owner scopes)
    /// </summary>
    /// <param name="orgNumber">Organization number (if not provided, uses first org from test data)</param>
    /// <param name="scope">Space-separated scopes (default: service owner read/write scopes)</param>
    /// <param name="org">Three-letter org code (required)</param>
    /// <returns>JWT token</returns>
    [HttpGet("serviceowner")]
    public async Task<ActionResult> GetServiceOwnerToken(
        [FromQuery] string? orgNumber = null,
        [FromQuery] string? scope = null,
        [FromQuery] string? org = null
    )
    {
        try
        {
            string token = await _testAuthenticationService.GetServiceOwnerToken(orgNumber, scope ?? TestAuthenticationService.DefaultServiceOwnerScope, org);
            return Ok(token);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to generate service owner token");
            return Problem(
                detail: ex.Message,
                title: "Failed to generate service owner token",
                statusCode: 400
            );
        }
    }

    /// <summary>
    /// Generate a token for a system user (Maskinporten token with system user authorization details)
    /// </summary>
    /// <param name="systemId">System ID (required) - must exist in test data</param>
    /// <param name="systemUserId">System User ID (required) - must exist in test data and belong to the specified system</param>
    /// <param name="scope">Space-separated scopes (default: "altinn:instances.read altinn:instances.write")</param>
    /// <returns>JWT token</returns>
    [HttpGet("systemuser")]
    public async Task<ActionResult> GetSystemUserToken(
        [FromQuery] string systemId,
        [FromQuery] string systemUserId,
        [FromQuery] string? scope = null
    )
    {
        try
        {
            string token = await _testAuthenticationService.GetSystemUserToken(systemId, systemUserId, scope);
            return Ok(token);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to generate system user token");
            return Problem(
                detail: ex.Message,
                title: "Failed to generate system user token",
                statusCode: 400
            );
        }
    }

    /// <summary>
    /// Generate a token by authentication type with flexible parameters
    /// </summary>
    /// <param name="type">Authentication type (User=1, SelfIdentifiedUser=2, Org=3, SystemUser=4, ServiceOwner=5)</param>
    /// <param name="userId">User ID</param>
    /// <param name="partyId">Party ID</param>
    /// <param name="authenticationLevel">Authentication level</param>
    /// <param name="username">Username</param>
    /// <param name="orgNumber">Organization number</param>
    /// <param name="org">Organization code</param>
    /// <param name="scope">Scopes</param>
    /// <param name="systemId">System ID</param>
    /// <param name="systemUserId">System User ID</param>
    /// <returns>JWT token</returns>
    [HttpGet("generate")]
    public async Task<ActionResult> GenerateToken(
        [FromQuery] AuthenticationTypes type,
        [FromQuery] int? userId = null,
        [FromQuery] int? partyId = null,
        [FromQuery] int authenticationLevel = 2,
        [FromQuery] string? username = null,
        [FromQuery] string? orgNumber = null,
        [FromQuery] string? org = null,
        [FromQuery] string? scope = null,
        [FromQuery] string? systemId = null,
        [FromQuery] string? systemUserId = null
    )
    {
        try
        {
            string token = await _testAuthenticationService.GenerateToken(
                type,
                userId,
                partyId,
                authenticationLevel,
                username,
                orgNumber,
                org,
                scope,
                systemId,
                systemUserId
            );
            return Ok(token);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to generate token");
            return Problem(
                detail: ex.Message,
                title: "Failed to generate token",
                statusCode: 400
            );
        }
    }

    /// <summary>
    /// Get information about available authentication types and test data
    /// </summary>
    /// <returns>Information about authentication types and available test data</returns>
    [HttpGet("info")]
    public async Task<ActionResult> GetInfo()
    {
        try
        {
            var info = await _testAuthenticationService.GetInfo();
            return Ok(info);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get test data info");
            return Problem(
                detail: ex.Message,
                title: "Failed to get test data info",
                statusCode: 500
            );
        }
    }
}
using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;

namespace Altinn.Studio.Designer.Infrastructure.Authorization;

/// <summary>
/// Authorization handler that validates authenticated users have authorized party access
/// to the organization for the current app.
/// </summary>
public sealed class OrgAccessHandler : AuthorizationHandler<OrgAccessRequirement>
{
    // ISO 6523 ICD 0192 prefix for organisation numbers
    private const string OrgNumberPrefix = "0192:";
    private const int PrefixLength = 5;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly IEnvironmentsService _environmentsService;
    private readonly ILogger<OrgAccessHandler> _logger;

    public OrgAccessHandler(
        IHttpContextAccessor httpContextAccessor,
        IEnvironmentsService environmentsService,
        ILogger<OrgAccessHandler> logger
    )
    {
        _httpContextAccessor = httpContextAccessor;
        _environmentsService = environmentsService;
        _logger = logger;
    }

    /// <inheritdoc/>
    protected override async Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        OrgAccessRequirement requirement
    )
    {
        var httpContext = _httpContextAccessor.HttpContext;
        if (httpContext is null)
        {
            context.Fail();
            return;
        }

        string? org = httpContext.GetRouteValue("org")?.ToString();
        if (string.IsNullOrWhiteSpace(org))
        {
            context.Fail();
            return;
        }

        string? accessToken = await httpContext.GetTokenAsync(
            CookieAuthenticationDefaults.AuthenticationScheme,
            "access_token"
        );

        if (string.IsNullOrWhiteSpace(accessToken))
        {
            LogOrgAccessDecision(org, null, [], false, "MissingAccessToken", accessToken);
            context.Fail();
            return;
        }

        var authorizedPartyOrgNumbers = ExtractAuthorizedPartyOrgNumbers(accessToken);
        if (authorizedPartyOrgNumbers.Length == 0)
        {
            LogOrgAccessDecision(org, null, authorizedPartyOrgNumbers, false, "MissingAuthorizedParties", accessToken);
            context.Fail();
            return;
        }

        var orgNr = await _environmentsService.GetAltinnOrgNumber(org);
        if (orgNr is null)
        {
            LogOrgAccessDecision(org, orgNr, authorizedPartyOrgNumbers, false, "UnknownOrgNumber", accessToken);
            context.Fail();
            return;
        }

        if (!string.IsNullOrWhiteSpace(orgNr) && authorizedPartyOrgNumbers.Contains(orgNr))
        {
            LogOrgAccessDecision(org, orgNr, authorizedPartyOrgNumbers, true, "Granted", accessToken);
            context.Succeed(requirement);
        }
        else
        {
            LogOrgAccessDecision(org, orgNr, authorizedPartyOrgNumbers, false, "OrgNumberMismatch", accessToken);
            context.Fail();
        }
    }

    internal string[] ExtractAuthorizedPartyOrgNumbers(string accessToken)
    {
        try
        {
            var handler = new JwtSecurityTokenHandler();
            var token = handler.ReadJwtToken(accessToken);

            if (!token.Payload.TryGetValue("authorization_details", out var authDetailsValue))
            {
                return [];
            }

            JsonElement authDetailsElement = authDetailsValue switch
            {
                JsonElement json => json,
                string jsonString => JsonSerializer.Deserialize<JsonElement>(jsonString),
                _ => throw new InvalidOperationException(
                    $"Unexpected authorization_details type: {authDetailsValue?.GetType().Name}"
                ),
            };

            // Handle both single object and array
            var detailsArray =
                authDetailsElement.ValueKind == JsonValueKind.Array
                    ? authDetailsElement.EnumerateArray()
                    : new[] { authDetailsElement }.AsEnumerable();

            return detailsArray.SelectMany(ExtractAuthorizedPartyIds).SelectMany(ExtractOrgNumber).Distinct().ToArray();
        }
        catch (SecurityTokenException)
        {
            return [];
        }
        catch (JsonException)
        {
            return [];
        }
        catch (Exception)
        {
            return [];
        }
    }

    private static IEnumerable<string> ExtractAuthorizedPartyIds(JsonElement authorizationDetail)
    {
        if (authorizationDetail.TryGetProperty("authorized_parties", out var authorizedParties))
        {
            foreach (var authorizedParty in authorizedParties.EnumerateArray())
            {
                if (authorizedParty.TryGetProperty("orgno", out var orgNo) && TryGetId(orgNo, out var id))
                {
                    yield return id;
                }
            }
        }
    }

    private static bool TryGetId(JsonElement element, out string id)
    {
        if (
            (element.TryGetProperty("ID", out var idElement) || element.TryGetProperty("id", out idElement))
            && idElement.GetString() is string idValue
        )
        {
            id = idValue;
            return true;
        }

        id = string.Empty;
        return false;
    }

    private static IEnumerable<string> ExtractOrgNumber(string id)
    {
        if (id.StartsWith(OrgNumberPrefix) && id.Length > PrefixLength)
        {
            return [id[PrefixLength..]];
        }

        return [];
    }

    private void LogOrgAccessDecision(
        string org,
        string? orgNumber,
        string[] authorizedPartyOrgNumbers,
        bool granted,
        string reason,
        string? accessToken
    )
    {
        _logger.LogWarning(
            "Org access decision. Granted={Granted}, Reason={Reason}, Org={Org}, OrgNumber={OrgNumber}, AuthorizedPartyOrgNumbers={AuthorizedPartyOrgNumbers}, JwtPayload={JwtPayload}",
            granted,
            reason,
            org,
            orgNumber,
            FormatOrgNumbers(authorizedPartyOrgNumbers),
            GetJwtPayloadForLogging(accessToken)
        );
    }

    private static string GetJwtPayloadForLogging(string? accessToken)
    {
        if (string.IsNullOrWhiteSpace(accessToken))
        {
            return string.Empty;
        }

        try
        {
            return JsonSerializer.Serialize(new JwtSecurityTokenHandler().ReadJwtToken(accessToken).Payload);
        }
        catch
        {
            return "Unable to parse JWT payload";
        }
    }

    private static string FormatOrgNumbers(string[] orgNumbers) => string.Join(",", orgNumbers);
}

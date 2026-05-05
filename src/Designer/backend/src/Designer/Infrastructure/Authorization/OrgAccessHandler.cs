using System;
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
/// Authorization handler that validates authenticated users have reportee access
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

        var reporteeOrgNumbers = ExtractReporteeOrgNumbers(accessToken);
        if (reporteeOrgNumbers.Length == 0)
        {
            LogOrgAccessDecision(org, null, reporteeOrgNumbers, false, "MissingReportees", accessToken);
            context.Fail();
            return;
        }

        var orgNr = await _environmentsService.GetAltinnOrgNumber(org);
        if (orgNr is null)
        {
            LogOrgAccessDecision(org, orgNr, reporteeOrgNumbers, false, "UnknownOrgNumber", accessToken);
            context.Fail();
            return;
        }

        if (!string.IsNullOrWhiteSpace(orgNr) && reporteeOrgNumbers.Contains(orgNr))
        {
            LogOrgAccessDecision(org, orgNr, reporteeOrgNumbers, true, "Granted", accessToken);
            context.Succeed(requirement);
        }
        else
        {
            LogOrgAccessDecision(org, orgNr, reporteeOrgNumbers, false, "OrgNumberMismatch", accessToken);
            context.Fail();
        }
    }

    internal string[] ExtractReporteeOrgNumbers(string accessToken)
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

            return detailsArray
                .Where(detail => detail.TryGetProperty("reportees", out _))
                .SelectMany(detail => detail.GetProperty("reportees").EnumerateArray())
                .SelectMany(reportee =>
                {
                    // Try both "ID" (current standard) and "id" (fallback) for resilience
                    if (
                        (reportee.TryGetProperty("ID", out var id) || reportee.TryGetProperty("id", out id))
                        && id.GetString() is string idStr
                        && idStr.StartsWith(OrgNumberPrefix)
                        && idStr.Length > PrefixLength
                    )
                    {
                        return [idStr[PrefixLength..]];
                    }
                    return Array.Empty<string>();
                })
                .Distinct()
                .ToArray();
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

    private void LogOrgAccessDecision(
        string org,
        string? orgNumber,
        string[] reporteeOrgNumbers,
        bool granted,
        string reason,
        string? accessToken
    )
    {
        _logger.LogWarning(
            "Org access decision. Granted={Granted}, Reason={Reason}, Org={Org}, OrgNumber={OrgNumber}, ReporteeOrgNumbers={ReporteeOrgNumbers}, JwtPayload={JwtPayload}",
            granted,
            reason,
            org,
            orgNumber,
            FormatOrgNumbers(reporteeOrgNumbers),
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

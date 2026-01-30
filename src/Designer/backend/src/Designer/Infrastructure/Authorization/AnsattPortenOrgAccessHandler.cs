using System;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;

namespace Altinn.Studio.Designer.Infrastructure.Authorization;

/// <summary>
/// Authorization handler that validates Ansattporten-authenticated users have reportee access
/// to the organization for the current app.
/// </summary>
public sealed class AnsattPortenOrgAccessHandler : AuthorizationHandler<AnsattPortenOrgAccessRequirement>
{
    // ISO 6523 ICD 0192 prefix for organisation numbers
    private const string OrgNumberPrefix = "0192:";
    private const int PrefixLength = 5;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly IEnvironmentsService _environmentsService;
    private readonly IHostEnvironment _hostEnvironment;
    private readonly ILogger<AnsattPortenOrgAccessHandler> _logger;

    public AnsattPortenOrgAccessHandler(
        IHttpContextAccessor httpContextAccessor,
        IEnvironmentsService environmentsService,
        IHostEnvironment hostEnvironment,
        ILogger<AnsattPortenOrgAccessHandler> logger)
    {
        _httpContextAccessor = httpContextAccessor;
        _environmentsService = environmentsService;
        _hostEnvironment = hostEnvironment;
        _logger = logger;
    }

    /// <inheritdoc/>
    protected override async Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        AnsattPortenOrgAccessRequirement requirement)
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
            AnsattPortenConstants.AnsattportenCookiesAuthenticationScheme,
            "access_token");

        if (string.IsNullOrWhiteSpace(accessToken))
        {
            context.Fail();
            return;
        }

        if (_hostEnvironment.IsProduction())
        {
            var reporteeOrgNumbers = ExtractReporteeOrgNumbers(accessToken);
            if (reporteeOrgNumbers.Length == 0)
            {
                context.Fail();
                return;
            }

            var orgNr = await _environmentsService.GetAltinnOrgNumber(org);
            if (orgNr is null)
            {
                context.Fail();
                return;
            }

            if (!string.IsNullOrWhiteSpace(orgNr) &&
                reporteeOrgNumbers.Contains(orgNr))
            {
                context.Succeed(requirement);
            }
            else
            {
                context.Fail();
            }
        }
        else
        {
            context.Succeed(requirement);
        }
    }

    private string[] ExtractReporteeOrgNumbers(string accessToken)
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
                _ => throw new InvalidOperationException($"Unexpected authorization_details type: {authDetailsValue?.GetType().Name}")
            };

            // Handle both single object and array
            var detailsArray = authDetailsElement.ValueKind == JsonValueKind.Array
                ? authDetailsElement.EnumerateArray()
                : new[] { authDetailsElement }.AsEnumerable();

            return detailsArray
                .Where(detail => detail.TryGetProperty("reportees", out _))
                .SelectMany(detail => detail.GetProperty("reportees").EnumerateArray())
                .SelectMany(reportee =>
                {
                    // Try both "ID" (current standard) and "id" (fallback) for resilience
                    if ((reportee.TryGetProperty("ID", out var id) ||
                         reportee.TryGetProperty("id", out id)) &&
                        id.GetString() is string idStr &&
                        idStr.StartsWith(OrgNumberPrefix) &&
                        idStr.Length > PrefixLength)
                    {
                        return [idStr[PrefixLength..]];
                    }
                    return Array.Empty<string>();
                })
                .Distinct()
                .ToArray();
        }
        catch (SecurityTokenException ex)
        {
            _logger.LogWarning(ex, "Invalid JWT token format in Ansattporten access token");
            return [];
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex, "Failed to parse authorization_details JSON from Ansattporten token");
            return [];
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error extracting reportee organization numbers from Ansattporten access token");
            return [];
        }
    }
}

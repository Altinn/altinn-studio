using System.Net.Http.Headers;
using System.Security.Claims;
using System.Text.Encodings.Web;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Internal.WorkflowEngine.Authentication;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Options;

namespace Altinn.App.Api.Infrastructure.Authentication;

/// <summary>
/// Authenticates workflow engine callbacks. The engine replays a JWT (minted by the app at enqueue time)
/// in the <c>Authorization: Bearer</c> header. The token is validated against the app's
/// <c>WorkflowEngineCallback</c> codes and must be bound to the instance in the route.
/// </summary>
/// <remarks>
/// The callback token shares the <c>Authorization</c> header with platform tokens, so the engine and the
/// default cookie/bearer scheme would otherwise conflict. A selector policy scheme
/// (<see cref="WorkflowEngineCallbackDefaults.SelectorScheme"/>) forwards callback requests to this scheme
/// and all other requests to the JwtCookie scheme, based on <see cref="IsCallbackRequest"/>.
/// </remarks>
internal sealed class WorkflowEngineCallbackAuthenticationHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    private readonly IWorkflowCallbackTokenValidator _validator;

    public WorkflowEngineCallbackAuthenticationHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder,
        IWorkflowCallbackTokenValidator validator
    )
        : base(options, logger, encoder)
    {
        _validator = validator;
    }

    /// <summary>
    /// Determines whether the matched <paramref name="endpoint"/> authenticates via this callback scheme, by
    /// inspecting its authorization metadata. Used by the selector scheme to forward only callback requests to
    /// this handler.
    /// </summary>
    public static bool IsCallbackRequest(Endpoint? endpoint) =>
        endpoint?.Metadata.GetOrderedMetadata<IAuthorizeData>().Any(HasCallbackScheme) is true;

    private static bool HasCallbackScheme(IAuthorizeData data) =>
        data.AuthenticationSchemes is { } schemes
        && schemes
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Contains(WorkflowEngineCallbackDefaults.AuthenticationScheme, StringComparer.Ordinal);

    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (
            !AuthenticationHeaderValue.TryParse(Request.Headers.Authorization, out AuthenticationHeaderValue? header)
            || !AuthorizationSchemes.Bearer.Equals(header.Scheme, StringComparison.OrdinalIgnoreCase)
            || string.IsNullOrWhiteSpace(header.Parameter)
        )
        {
            // No bearer token: let the pipeline treat this as unauthenticated (401).
            return AuthenticateResult.NoResult();
        }

        string token = header.Parameter;

        // The token is bound to the instance via its jti claim; verify against the route's instanceGuid.
        if (
            Request.RouteValues.TryGetValue("instanceGuid", out object? routeValue) is false
            || Guid.TryParse(routeValue?.ToString(), out Guid instanceGuid) is false
        )
        {
            return AuthenticateResult.Fail("Could not resolve instanceGuid from the request route.");
        }

        if (await _validator.ValidateToken(token, instanceGuid) is false)
        {
            return AuthenticateResult.Fail("Invalid workflow engine callback token.");
        }

        var claims = new[] { new Claim(ClaimTypes.NameIdentifier, instanceGuid.ToString()) };
        var identity = new ClaimsIdentity(claims, WorkflowEngineCallbackDefaults.AuthenticationScheme);
        var ticket = new AuthenticationTicket(
            new ClaimsPrincipal(identity),
            WorkflowEngineCallbackDefaults.AuthenticationScheme
        );
        return AuthenticateResult.Success(ticket);
    }
}

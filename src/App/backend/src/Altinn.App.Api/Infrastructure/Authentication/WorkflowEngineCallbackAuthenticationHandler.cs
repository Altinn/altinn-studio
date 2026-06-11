using System.Security.Claims;
using System.Text.Encodings.Web;
using Altinn.App.Core.Internal.WorkflowEngine.Authentication;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;

namespace Altinn.App.Api.Infrastructure.Authentication;

/// <summary>
/// Authenticates workflow engine callbacks. The engine replays a JWT (minted by the app at enqueue time)
/// as an <c>Authorization: Bearer</c> header. The token is validated against the app's
/// <c>WorkflowEngineCallback</c> codes and must be bound to the instance in the route.
/// </summary>
internal sealed class WorkflowEngineCallbackAuthenticationHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    /// <summary>
    /// The name of the authentication scheme.
    /// </summary>
    public const string SchemeName = "WorkflowEngineCallback";

    private const string BearerPrefix = "Bearer ";

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

    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        string? authorization = Request.Headers.Authorization;
        if (
            string.IsNullOrWhiteSpace(authorization)
            || !authorization.StartsWith(BearerPrefix, StringComparison.Ordinal)
        )
        {
            // No bearer token: let the pipeline treat this as unauthenticated (401).
            return AuthenticateResult.NoResult();
        }

        string token = authorization[BearerPrefix.Length..].Trim();

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
        var identity = new ClaimsIdentity(claims, SchemeName);
        var ticket = new AuthenticationTicket(new ClaimsPrincipal(identity), SchemeName);
        return AuthenticateResult.Success(ticket);
    }
}

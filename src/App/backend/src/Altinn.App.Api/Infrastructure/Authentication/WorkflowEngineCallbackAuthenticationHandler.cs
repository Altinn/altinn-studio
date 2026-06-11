using System.Security.Claims;
using System.Text.Encodings.Web;
using Altinn.App.Core.Internal.WorkflowEngine.Authentication;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;

namespace Altinn.App.Api.Infrastructure.Authentication;

/// <summary>
/// Authenticates workflow engine callbacks. The engine replays a JWT (minted by the app at enqueue time)
/// in the <c>Altinn-Workflow-Callback-Token</c> header. The token is validated against the app's
/// <c>WorkflowEngineCallback</c> codes and must be bound to the instance in the route.
/// </summary>
internal sealed class WorkflowEngineCallbackAuthenticationHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    /// <summary>
    /// The name of the authentication scheme.
    /// </summary>
    public const string SchemeName = "WorkflowEngineCallback";

    /// <summary>
    /// The request header carrying the workflow engine callback token. A dedicated header is used (rather
    /// than <c>Authorization</c>) so the token is not mistaken for an Altinn platform token by the default
    /// authentication scheme.
    /// </summary>
    public const string TokenHeaderName = "Altinn-Workflow-Callback-Token";

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
        string? token = Request.Headers[TokenHeaderName];
        if (string.IsNullOrWhiteSpace(token))
        {
            // No token: let the pipeline treat this as unauthenticated (401).
            return AuthenticateResult.NoResult();
        }

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

using Altinn.App.Core.Internal.WorkflowEngine.Authentication;

namespace Altinn.App.Api.Infrastructure.Authentication;

/// <summary>
/// Default scheme names for workflow engine callback authentication, mirroring the
/// <c>JwtCookieDefaults</c> convention.
/// </summary>
internal static class WorkflowEngineCallbackDefaults
{
    /// <summary>
    /// The authentication scheme that validates workflow engine callback tokens
    /// (<see cref="WorkflowEngineCallbackAuthenticationHandler"/>).
    /// </summary>
    public const string AuthenticationScheme = WorkflowCallbackAuthentication.Scheme;

    /// <summary>
    /// The default (selector) policy scheme that forwards callback requests to
    /// <see cref="AuthenticationScheme"/> and all other requests to the JwtCookie scheme.
    /// </summary>
    public const string SelectorScheme = "WorkflowEngineCallbackSelector";
}

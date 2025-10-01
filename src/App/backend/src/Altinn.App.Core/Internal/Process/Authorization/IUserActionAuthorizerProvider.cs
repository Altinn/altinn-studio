using Altinn.App.Core.Features;

namespace Altinn.App.Core.Internal.Process.Authorization;

/// <summary>
/// Register a user action authorizer for a given action and/or task
/// </summary>
[ImplementableByApps]
public interface IUserActionAuthorizerProvider
{
    /// <summary>
    /// Gets or sets the action
    /// </summary>
    public string? Action { get; }

    /// <summary>
    /// Gets or sets the task id
    /// </summary>
    public string? TaskId { get; }

    /// <summary>
    /// Gets or sets the authorizer implementation
    /// </summary>
    public IUserActionAuthorizer Authorizer { get; }
}

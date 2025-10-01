using Altinn.App.Core.Features;

namespace Altinn.App.Core.Internal.Process.Authorization;

/// <summary>
/// Register a user action authorizer for a given action and/or task
/// </summary>
public class UserActionAuthorizerProvider : IUserActionAuthorizerProvider
{
    private readonly Func<IUserActionAuthorizer> _factory;

    /// <summary>
    /// Initializes a new instance of the <see cref="UserActionAuthorizerProvider"/> class
    /// </summary>
    /// <param name="taskId"></param>
    /// <param name="action"></param>
    /// <param name="factory"></param>
    public UserActionAuthorizerProvider(string? taskId, string? action, Func<IUserActionAuthorizer> factory)
    {
        TaskId = taskId;
        Action = action;
        _factory = factory;
    }

    /// <inheritdoc/>
    public string? Action { get; set; }

    /// <inheritdoc/>
    public string? TaskId { get; set; }

    /// <inheritdoc/>
    public IUserActionAuthorizer Authorizer
    {
        get => _factory();
    }
}

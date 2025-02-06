using System.Security.Claims;
using Altinn.App.Core.Features.Auth;
using Altinn.App.Core.Models;

namespace Altinn.App.Core.Features.Action;

/// <summary>
/// Context for authorization of user actions
/// </summary>
public class UserActionAuthorizerContext
{
    /// <summary>
    /// Initializes a new instance of the <see cref="UserActionAuthorizerContext"/> class
    /// </summary>
    /// <param name="user"><see cref="ClaimsPrincipal"/> for the user</param>
    /// <param name="instanceIdentifier"><see cref="InstanceIdentifier"/> for the instance</param>
    /// <param name="taskId">The id of the task</param>
    /// <param name="action">The action to authorize</param>
    /// <param name="authentication">Information about the authenticated party</param>
    public UserActionAuthorizerContext(
        ClaimsPrincipal user,
        InstanceIdentifier instanceIdentifier,
        string? taskId,
        string action,
        Authenticated authentication
    )
    {
#pragma warning disable CS0618 // Type or member is obsolete
        User = user;
#pragma warning restore CS0618 // Type or member is obsolete
        Authentication = authentication;
        InstanceIdentifier = instanceIdentifier;
        TaskId = taskId;
        Action = action;
    }

    /// <summary>
    /// Gets or sets the user
    /// </summary>
    [Obsolete("Use the Authentication property instead")]
    public ClaimsPrincipal User { get; set; }

    /// <summary>
    /// Gets or sets the authentication information
    /// </summary>
    public Authenticated Authentication { get; }

    /// <summary>
    /// Gets or sets the instance identifier
    /// </summary>
    public InstanceIdentifier InstanceIdentifier { get; set; }

    /// <summary>
    /// Gets or sets the task id
    /// </summary>
    public string? TaskId { get; set; }

    /// <summary>
    /// Gets or sets the action
    /// </summary>
    public string Action { get; set; }
}

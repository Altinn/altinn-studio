using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Models.UserAction;

/// <summary>
/// Context for user actions
/// </summary>
public class UserActionContext
{
    /// <summary>
    /// Creates a new instance of the <see cref="UserActionContext"/> class
    /// </summary>
    /// <param name="instance">The instance the action is performed on</param>
    /// <param name="userId">The user performing the action</param>
    public UserActionContext(Instance instance, int userId)
    {
        Instance = instance;
        UserId = userId;
    }

    /// <summary>
    /// The instance the action is performed on
    /// </summary>
    public Instance Instance { get; }
    
    /// <summary>
    /// The user performing the action
    /// </summary>
    public int UserId { get; }
}
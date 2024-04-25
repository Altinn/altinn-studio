using Altinn.App.Core.Internal;

namespace Altinn.App.Core.Features.Action;

/// <summary>
/// Factory class for resolving <see cref="IUserAction"/> implementations
/// based on the id of the action.
/// </summary>
public class UserActionService
{
    private readonly IEnumerable<IUserAction> _actionHandlers;

    /// <summary>
    /// Initializes a new instance of the <see cref="UserActionService"/> class.
    /// </summary>
    /// <param name="actionHandlers">The list of action handlers to choose from.</param>
    public UserActionService(IEnumerable<IUserAction> actionHandlers)
    {
        _actionHandlers = actionHandlers;
    }

    /// <summary>
    /// Find the implementation of <see cref="IUserAction"/> based on the actionId
    /// </summary>
    /// <param name="actionId">The id of the action to handle.</param>
    /// <returns>The first implementation of <see cref="IUserAction"/> that matches the actionId. If no match null is returned</returns>
    public IUserAction? GetActionHandler(string? actionId)
    {
        if (actionId != null)
        {
            return _actionHandlers.FirstOrDefault(ah => ah.Id.Equals(actionId, StringComparison.OrdinalIgnoreCase));
        }

        return null;
    }
}

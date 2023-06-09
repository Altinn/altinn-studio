namespace Altinn.App.Core.Features.Action;

/// <summary>
/// Factory class for resolving <see cref="IUserAction"/> implementations
/// based on the id of the action.
/// </summary>
public class UserActionFactory
{
    private readonly IEnumerable<IUserAction> _actionHandlers;

    /// <summary>
    /// Initializes a new instance of the <see cref="UserActionFactory"/> class.
    /// </summary>
    /// <param name="actionHandlers">The list of action handlers to choose from.</param>
    public UserActionFactory(IEnumerable<IUserAction> actionHandlers)
    {
        _actionHandlers = actionHandlers;
    }

    /// <summary>
    /// Find the implementation of <see cref="IUserAction"/> based on the actionId
    /// </summary>
    /// <param name="actionId">The id of the action to handle.</param>
    /// <returns>The first implementation of <see cref="IUserAction"/> that matches the actionId. If no match <see cref="NullUserAction"/> is returned</returns>
    public IUserAction GetActionHandler(string? actionId)
    {
        if (actionId != null)
        {
            return _actionHandlers.Where(ah => ah.Id.Equals(actionId, StringComparison.OrdinalIgnoreCase)).FirstOrDefault(new NullUserAction());
        }

        return new NullUserAction();
    }
}
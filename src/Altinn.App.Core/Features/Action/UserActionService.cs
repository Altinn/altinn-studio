using Microsoft.Extensions.DependencyInjection;

namespace Altinn.App.Core.Features.Action;

/// <summary>
/// Factory class for resolving <see cref="IUserAction"/> implementations
/// based on the id of the action.
/// </summary>
public class UserActionService
{
    private readonly AppImplementationFactory _appImplementationFactory;

    /// <summary>
    /// Initializes a new instance of the <see cref="UserActionService"/> class.
    /// </summary>
    /// <param name="serviceProvider">Service provider.</param>
    public UserActionService(IServiceProvider serviceProvider)
    {
        _appImplementationFactory = serviceProvider.GetRequiredService<AppImplementationFactory>();
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
            var handlers = _appImplementationFactory.GetAll<IUserAction>();
            return handlers.FirstOrDefault(ah => ah.Id.Equals(actionId, StringComparison.OrdinalIgnoreCase));
        }

        return null;
    }
}

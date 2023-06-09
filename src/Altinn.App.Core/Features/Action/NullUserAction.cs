using Altinn.App.Core.Models.UserAction;

namespace Altinn.App.Core.Features.Action;

/// <summary>
/// Null action handler for cases where there is no match on the requested <see cref="IUserAction"/>
/// </summary>
public class NullUserAction: IUserAction
{
    /// <inheritdoc />
    public string Id => "null";

    /// <inheritdoc />
    public Task<bool> HandleAction(UserActionContext context)
    {
        return Task.FromResult(true);
    }
}
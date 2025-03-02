using Altinn.App.Core.Features.Action;

namespace Altinn.App.Core.Features;

/// <summary>
/// Interface for writing custom authorization logic for actions in the app that cannot be handled by the default authorization policies
/// </summary>
[ImplementableByApps]
public interface IUserActionAuthorizer
{
    /// <summary>
    /// Authorizes the action in the given context
    /// </summary>
    /// <param name="context"><see cref="UserActionAuthorizerContext"/> for the action to authorize</param>
    /// <returns>true if user is authorized to perform the action, false if not</returns>
    Task<bool> AuthorizeAction(UserActionAuthorizerContext context);
}

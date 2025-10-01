namespace Altinn.App.Core.Interface;

/// <summary>
/// Defines the methods required for an implementation of a user JSON Web Token provider.
/// The provider is used by client implementations that needs the user token in requests
/// against other systems.
/// </summary>
[Obsolete(message: "Use Altinn.App.Core.Internal.Auth.IUserTokenProvider instead", error: true)]
public interface IUserTokenProvider
{
    /// <summary>
    /// Defines a method that can return a JSON Web Token of the current user.
    /// </summary>
    /// <returns>The Json Web Token for the current user.</returns>
    public string GetUserToken();
}

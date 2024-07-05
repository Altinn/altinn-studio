namespace Altinn.App.Core.Internal.Maskinporten;

/// <summary>
/// Defines the interface required for an implementation of a Maskinporte token provider.
/// The provider is used by client implementations that needs the Maskinporten token in requests
/// against other systems.
/// </summary>
[Obsolete(
    "Use Altinn.App.Api.ServiceCollectionExtensions.ConfigureMaskinportenClient instead. This interface will be removed in V9."
)]
public interface IMaskinportenTokenProvider
{
    /// <summary>
    /// Defines a method that can return a Maskinporten token.
    /// </summary>
    Task<string> GetToken(string scopes);

    /// <summary>
    /// Defines a method that returns a token that has been exchanged to an Altinn token.
    /// </summary>
    Task<string> GetAltinnExchangedToken(string scopes);
}

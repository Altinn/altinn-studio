using Microsoft.IdentityModel.Protocols;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;

namespace Altinn.App.Api.Tests.Mocks.Authentication;

/// <summary>
/// Represents a stub of <see cref="ConfigurationManager{OpenIdConnectConfiguration}"/> to be used in integration tests.
/// </summary>
public class ConfigurationManagerStub : IConfigurationManager<OpenIdConnectConfiguration>
{
    /// <summary>
    /// Initializes a new instance of <see cref="ConfigurationManagerStub" />
    /// </summary>
    /// <param name="metadataAddress">The address to obtain configuration.</param>
    /// <param name="configRetriever">The <see cref="IConfigurationRetriever{OpenIdConnectConfiguration}" /></param>
    /// <param name="docRetriever">The <see cref="IDocumentRetriever" /> that reaches out to obtain the configuration.</param>
    public ConfigurationManagerStub(
        string metadataAddress,
        IConfigurationRetriever<OpenIdConnectConfiguration> configRetriever,
        IDocumentRetriever docRetriever
    ) { }

    /// <inheritdoc />
    public Task<OpenIdConnectConfiguration> GetConfigurationAsync(CancellationToken cancel)
    {
        OpenIdConnectConfiguration configuration = new OpenIdConnectConfiguration();

        configuration.SigningKeys.Add(JwtTokenMock.GetPublicKey());

        return Task.FromResult(configuration);
    }

    /// <inheritdoc />
    public void RequestRefresh()
    {
        throw new NotImplementedException();
    }
}

using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

using Microsoft.IdentityModel.Protocols;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Microsoft.IdentityModel.Tokens;

namespace Altinn.App.IntegrationTests.Mocks.Authentication
{
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
            IDocumentRetriever docRetriever)
        {
        }

        /// <inheritdoc />
        public async Task<OpenIdConnectConfiguration> GetConfigurationAsync(CancellationToken cancel)
        {
            SigningKeysRetrieverStub signingKeysRetriever = new SigningKeysRetrieverStub();
            ICollection<SecurityKey> signingKeys = await signingKeysRetriever.GetSigningKeys(string.Empty);

            OpenIdConnectConfiguration configuration = new OpenIdConnectConfiguration();
            foreach (var securityKey in signingKeys)
            {
                configuration.SigningKeys.Add(securityKey);
            }

            return configuration;
        }

        /// <inheritdoc />
        public void RequestRefresh()
        {
            throw new NotImplementedException();
        }
    }
}

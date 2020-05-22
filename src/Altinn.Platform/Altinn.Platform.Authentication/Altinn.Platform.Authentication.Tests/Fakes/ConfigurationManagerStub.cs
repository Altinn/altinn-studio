using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

using Microsoft.IdentityModel.Protocols;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Microsoft.IdentityModel.Tokens;

namespace Altinn.Platform.Authentication.Tests.Fakes
{
    /// <summary>
    /// Represents a stub of <see cref="ConfigurationManager{OpenIdConnectConfiguration}"/> to be used in integration tests.
    /// </summary>
    public class ConfigurationManagerStub : IConfigurationManager<OpenIdConnectConfiguration>
    {
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

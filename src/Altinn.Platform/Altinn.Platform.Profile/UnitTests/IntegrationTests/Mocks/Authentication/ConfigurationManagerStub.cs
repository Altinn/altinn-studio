using System;
using System.Collections.Generic;
using System.Security.Cryptography.X509Certificates;
using System.Threading;
using System.Threading.Tasks;

using Microsoft.IdentityModel.Protocols;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Microsoft.IdentityModel.Tokens;

namespace Altinn.Platform.Profile.Tests.IntegrationTests.Mocks.Authentication
{
    /// <summary>
    /// Represents a stub of <see cref="ConfigurationManager{OpenIdConnectConfiguration}"/> to
    /// be used in integration tests.
    /// </summary>
    public class ConfigurationManagerStub : IConfigurationManager<OpenIdConnectConfiguration>
    {
        /// <inheritdoc />
        public async Task<OpenIdConnectConfiguration> GetConfigurationAsync(CancellationToken _)
        {
            ICollection<SecurityKey> signingKeys = await GetSigningKeys(string.Empty);

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

        private async Task<ICollection<SecurityKey>> GetSigningKeys(string _)
        {
            X509Certificate2 cert = new X509Certificate2("JWTValidationCert.cer");
            SecurityKey key = new X509SecurityKey(cert);

            List<SecurityKey> signingKeys = new() { key };

            return await Task.FromResult(signingKeys);
        }
    }
}

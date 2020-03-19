using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.Platform.Authentication.Services.Interfaces;
using Microsoft.IdentityModel.Protocols;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Microsoft.IdentityModel.Tokens;

namespace Altinn.Platform.Authentication.Services
{
    /// <inheritdoc />
    public class SigningKeysRetriever : ISigningKeysRetriever
    {
        /// <inheritdoc />
        public async Task<ICollection<SecurityKey>> GetSigningKeys(string url)
        {
            var configurationManager = new ConfigurationManager<OpenIdConnectConfiguration>(
                url,
                new OpenIdConnectConfigurationRetriever(),
                new HttpDocumentRetriever());

            var discoveryDocument = await configurationManager.GetConfigurationAsync();
            ICollection<SecurityKey> signingKeys = discoveryDocument.SigningKeys;

            return signingKeys;
        }
    }
}

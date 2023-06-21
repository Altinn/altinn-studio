using System;
using System.Text;
using System.Threading.Tasks;
using Altinn.ApiClients.Maskinporten.Interfaces;
using Altinn.ApiClients.Maskinporten.Models;
using Altinn.Studio.Designer.Configuration;
using Azure.Security.KeyVault.Secrets;
using Microsoft.Extensions.Options;

namespace Altinn.Studio.Designer.Services.Implementation
{
    public class MaskinPortenClientDefinition : IClientDefinition
    {
        //private ISecrets _secrets;
        private SecretClient _secretClient;

        public IMaskinportenSettings ClientSettings { get; set; }

        public MaskinPortenClientDefinition(IOptions<MaskinportenClientSettings> clientSettings)
        {
            ClientSettings = clientSettings.Value;
        }

        public async Task<ClientSecrets> GetClientSecrets()
        {
            ClientSecrets clientSecrets = new ClientSecrets();

            byte[] base64EncodedBytes = Convert.FromBase64String(ClientSettings.EncodedJwk);
            string jwkjson = Encoding.UTF8.GetString(base64EncodedBytes);
            clientSecrets.ClientKey = new Microsoft.IdentityModel.Tokens.JsonWebKey(jwkjson);
            return clientSecrets;
        }
    }
}

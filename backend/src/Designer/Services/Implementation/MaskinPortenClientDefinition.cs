using System.Text;
using System;
using System.Threading.Tasks;
using Altinn.ApiClients.Maskinporten.Config;
using Altinn.ApiClients.Maskinporten.Interfaces;
using Altinn.ApiClients.Maskinporten.Models;
using Microsoft.Extensions.Options;
using Azure.Security.KeyVault.Secrets;
using Altinn.Studio.Designer.Configuration;

namespace Altinn.Studio.Designer.Services.Implementation
{
    public class MaskinPortenClientDefinition : IClientDefinition
    {
        //private ISecrets _secrets;
        private SecretClient _secretClient;

        public IMaskinportenSettings ClientSettings { get; set; }
        //public MaskinportenClientSettings ClientSettings { get; set; }

        public MaskinPortenClientDefinition(IOptions<MaskinportenClientSettings> clientSettings)
        {
            ClientSettings = clientSettings.Value;
            //_secrets = secrets;
        }

        public async Task<ClientSecrets> GetClientSecrets()
        {
            ClientSecrets clientSecrets = new ClientSecrets();

            // Depending on runtime mode the secrets service will get data from keyvault or secrets.json when running locally
            // https://docs.altinn.studio/app/development/configuration/secrets/
            //string base64encodedJWK = await _secrets.GetSecretAsync("maskinportenJwk");
            byte[] base64EncodedBytes = Convert.FromBase64String(ClientSettings.EncodedJwk);
            string jwkjson = Encoding.UTF8.GetString(base64EncodedBytes);
            clientSecrets.ClientKey = new Microsoft.IdentityModel.Tokens.JsonWebKey(jwkjson);
            return clientSecrets;
        }
    }
}

using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Net.Http;
using System.Security.Cryptography.X509Certificates;
using System.Threading.Tasks;
using AltinnCore.Common.Configuration;
using AltinnCore.Designer.Infrastructure.Authentication;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Microsoft.Rest.TransientFaultHandling;

namespace AltinnCore.Designer.TypedHttpClients.Maskinporten
{
    /// <summary>
    /// MaskinportenClient
    /// </summary>
    public class MaskinportenClient : IMaskinportenClient
    {
        private readonly HttpClient _httpClient;
        private readonly GeneralSettings _generalSettings;
        private readonly X509Certificate2 _certificate;

        /// <summary>
        /// Constructor
        /// </summary>
        /// <param name="options">IOptionsMonitor of type GeneralSettings</param>
        /// <param name="httpClient">HttpClient</param>
        public MaskinportenClient(
            IOptionsMonitor<GeneralSettings> options,
            HttpClient httpClient)
        {
            _httpClient = httpClient;
            _generalSettings = options.CurrentValue;
            byte[] pfxBytes = Convert.FromBase64String(_generalSettings.MaskinportenCertificate);
            _certificate = new X509Certificate2(pfxBytes);
        }

        /// <inheritdoc />
        public async Task<AccessTokenModel> CreateToken()
        {
            string jwtAssertion = GetJwtAssertion();
            FormUrlEncodedContent content = GetUrlEncodedContent(jwtAssertion);
            HttpResponseMessage response = await _httpClient.PostAsync("token", content);
            return await response.Content.ReadAsAsync<AccessTokenModel>();
        }

        private string GetJwtAssertion()
        {
            X509SecurityKey securityKey = new X509SecurityKey(_certificate);
            JwtHeader header = new JwtHeader(new SigningCredentials(securityKey, SecurityAlgorithms.RsaSha256))
            {
                { "x5c", new List<string> { Convert.ToBase64String(_certificate.GetRawCertData()) } }
            };
            header.Remove("typ");
            header.Remove("kid");

            DateTimeOffset dateTimeOffset = new DateTimeOffset(DateTime.UtcNow);
            JwtPayload payload = new JwtPayload
            {
                { "aud", _generalSettings.MaskinportenBaseAddress },
                { "resource", _generalSettings.MaskinportenResource },
                { "scope", _generalSettings.MaskinportenScopes },
                { "iss",  _generalSettings.MaskinportenClientId },
                { "exp", dateTimeOffset.ToUnixTimeSeconds() + 10 },
                { "iat", dateTimeOffset.ToUnixTimeSeconds() },
                { "jti", Guid.NewGuid().ToString() },
            };

            JwtSecurityToken securityToken = new JwtSecurityToken(header, payload);
            JwtSecurityTokenHandler handler = new JwtSecurityTokenHandler();

            return handler.WriteToken(securityToken);
        }

        private FormUrlEncodedContent GetUrlEncodedContent(string assertion)
        {
            FormUrlEncodedContent formContent = new FormUrlEncodedContent(new List<KeyValuePair<string, string>>
            {
                new KeyValuePair<string, string>("grant_type", "urn:ietf:params:oauth:grant-type:jwt-bearer"),
                new KeyValuePair<string, string>("assertion", assertion),
            });

            return formContent;
        }
    }
}

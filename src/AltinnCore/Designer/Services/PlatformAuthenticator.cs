using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Net.Http;
using System.Security.Cryptography.X509Certificates;
using System.Threading.Tasks;
using AltinnCore.Common.Configuration;
using AltinnCore.Designer.Infrastructure.Authentication;
using AltinnCore.Designer.TypedHttpClients.AltinnAuthentication;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Microsoft.Rest.TransientFaultHandling;

namespace AltinnCore.Designer.Services
{
    /// <summary>
    /// PlatformAuthenticator
    /// </summary>
    public class PlatformAuthenticator : IPlatformAuthenticator
    {
        private readonly X509Certificate2 _certificate;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IAltinnAuthenticationService _altinnAuthenticationService;
        private readonly GeneralSettings _generalSettings;

        /// <summary>
        /// Constructor
        /// </summary>
        /// <param name="options">IOptionsMonitor of type GeneralSettings</param>
        /// <param name="httpClientFactory">IHttpClientFactory</param>
        /// <param name="altinnAuthenticationService">IAltinnAuthenticationService</param>
        public PlatformAuthenticator(
            IOptionsMonitor<GeneralSettings> options,
            IHttpClientFactory httpClientFactory,
            IAltinnAuthenticationService altinnAuthenticationService)
        {
            _generalSettings = options.CurrentValue;
            byte[] pfxBytes = Convert.FromBase64String(_generalSettings.MaskinportenCertificate);
            _certificate = new X509Certificate2(pfxBytes);
            _httpClientFactory = httpClientFactory;
            _altinnAuthenticationService = altinnAuthenticationService;
        }

        /// <summary>
        /// Gets a converted Maskinporten token from Platform.Authentication
        /// </summary>
        /// <returns></returns>
        public async Task<string> GetConvertedTokenAsync()
        {
            AccessTokenModel maskinportenToken = await CreateMaskinportenTokenAsync();
            return await _altinnAuthenticationService.ConvertTokenAsync(maskinportenToken.AccessToken);
        }

        private async Task<AccessTokenModel> CreateMaskinportenTokenAsync()
        {
            string jwtAssertion = GetJwtAssertion();
            FormUrlEncodedContent content = GetUrlEncodedContent(jwtAssertion);

            HttpClient httpClient = _httpClientFactory.CreateClient("maskinporten");
            httpClient.BaseAddress = new Uri(_generalSettings.MaskinportenBaseAddress);
            httpClient.Timeout = new TimeSpan(0, 0, 30);

            HttpResponseMessage response = await httpClient.PostAsync("token", content);
            if (!response.IsSuccessStatusCode)
            {
                throw new HttpRequestWithStatusException($"Can not create token in Maskinporten. {response.ReasonPhrase}")
                {
                    StatusCode = response.StatusCode
                };
            }

            return await response.Content.ReadAsAsync<AccessTokenModel>();
        }

        private string GetJwtAssertion()
        {
            X509SecurityKey securityKey = new X509SecurityKey(_certificate);
            JwtHeader header = new JwtHeader(new SigningCredentials(securityKey, SecurityAlgorithms.RsaSha256))
            {
                {"x5c", new List<string>() {Convert.ToBase64String(_certificate.GetRawCertData())}}
            };
            header.Remove("typ");
            header.Remove("kid");

            DateTimeOffset dateTimeOffset = new DateTimeOffset(DateTime.UtcNow);
            JwtPayload payload = new JwtPayload
            {
                { "aud", "https://oidc-ver2.difi.no/idporten-oidc-provider/" },
                { "resource", "https://tt02.altinn.no/maskinporten-api/" },
                { "scope", "altinn:instances.read altinn:instances.write" },
                { "iss",  _generalSettings.MaskinportenClientId}, // TODO Put this in secret
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

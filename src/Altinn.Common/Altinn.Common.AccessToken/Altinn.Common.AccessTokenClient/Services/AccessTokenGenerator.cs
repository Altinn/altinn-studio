using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography.X509Certificates;
using Altinn.Common.AccessTokenClient.Configuration;
using Altinn.Common.AccessTokenClient.Constants;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace Altinn.Common.AccessTokenClient.Services
{
    /// <summary>
    /// Access token generator creating access tokens for accessing platform components
    /// </summary>
    public class AccessTokenGenerator : IAccessTokenGenerator
    {
        private readonly AccessTokenSettings _accessTokenSettings;
        private readonly ISigningCredentialsResolver _signingKeysResolver;
        private readonly ILogger _logger;

        /// <summary>
        /// Default constructor. 
        /// </summary>
        /// <param name="logger">The logger</param>
        /// <param name="accessTokenSettings">Settings for access token</param>
        /// <param name="signingKeysResolver">The signingkeys resolver</param>
        public AccessTokenGenerator(ILogger<AccessTokenGenerator> logger, IOptions<AccessTokenSettings> accessTokenSettings, ISigningCredentialsResolver signingKeysResolver = null)
        {
            _accessTokenSettings = accessTokenSettings.Value;
            _signingKeysResolver = signingKeysResolver;
            _logger = logger;
        }

        /// <summary>
        /// Generates a access token for apps in altinn apps or platform components needing to access other platform components.
        /// </summary>
        /// <param name="issuer">Can be a app or platform component</param>
        /// <param name="app">The application creating token (app or component)</param>
        /// <returns></returns>
        public string GenerateAccessToken(string issuer, string app)
        {
            if (_accessTokenSettings.DisableAccessTokenGeneration)
            {
                return null;
            }

            return GenerateAccessToken(issuer, app, _signingKeysResolver.GetSigningCredentials());
        }

        /// <summary>
        /// Generates a access token for anyone needing to access other platform components.
        /// </summary>
        /// <param name="issuer">Can be a app or platform component</param>
        /// <param name="app">The application creating token (app or component)</param>
        /// <param name="certificate">Certificate to generate SigningCredentials</param>
        /// <returns>Accesstoken</returns>
        public string GenerateAccessToken(string issuer, string app, X509Certificate2 certificate)
        {
            if (_accessTokenSettings.DisableAccessTokenGeneration)
            {
                return null;
            }

            return GenerateAccessToken(issuer, app, new X509SigningCredentials(certificate, SecurityAlgorithms.RsaSha256));
        }

        private string GenerateAccessToken(string issuer, string app, SigningCredentials signingCredentials)
        {
            try
            {
                List<Claim> claims = new List<Claim>();
                if (!string.IsNullOrEmpty(app))
                {
                    claims.Add(new Claim(AccessTokenClaimTypes.App, app, ClaimValueTypes.String, issuer));
                }

                ClaimsIdentity identity = new ClaimsIdentity("AccessToken");
                identity.AddClaims(claims);
                ClaimsPrincipal principal = new ClaimsPrincipal(identity);

                JwtSecurityTokenHandler tokenHandler = new JwtSecurityTokenHandler();
                SecurityTokenDescriptor tokenDescriptor = new SecurityTokenDescriptor
                {
                    Subject = new ClaimsIdentity(principal.Identity),
                    Expires = DateTime.UtcNow.AddSeconds(_accessTokenSettings.TokenLifetimeInSeconds),
                    SigningCredentials = signingCredentials,
                    Audience = "platform.altinn.no",
                    Issuer = issuer
                };

                SecurityToken token = tokenHandler.CreateToken(tokenDescriptor);
                string tokenstring = tokenHandler.WriteToken(token);

                return tokenstring;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Not able to generate access token");
            }

            return null;
        }
    }
}

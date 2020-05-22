using Altinn.Common.AccessTokenClient.Configuration;
using Altinn.Common.AccessTokenClient.Constants;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace Altinn.Common.AccessTokenClient.Services
{
    /// <summary>
    /// Access token generator creating access tokens for accessing platform components
    /// </summary>
    public class AccessTokenGenerator: IAccessTokenGenerator
    {
        private readonly AccessTokenSettings _accessTokenSettings;
        private readonly ISigningCredentialsResolver _signingKeysResolver;
        private readonly ILogger _logger;

        /// <summary>
        /// Default constructor. 
        /// </summary>
        /// <param name="logger">The logger</param>
        /// <param name="accessTokenSettings"></param>
        /// <param name="signingKeysResolver"></param>
        public AccessTokenGenerator(ILogger<AccessTokenGenerator> logger, IOptions<AccessTokenSettings> accessTokenSettings, ISigningCredentialsResolver signingKeysResolver)
        {
            _accessTokenSettings = accessTokenSettings.Value;
            _signingKeysResolver = signingKeysResolver;
            _logger = logger;
        }

        /// <summary>
        /// Generates a access token for apps in altinn apps or platform components needing to access other platform components.
        /// </summary>
        /// <param name="issuer">Can be a app or platform component</param>
        /// <param name="app"></param>
        /// <returns></returns>
        public string GenerateAccessToken(string issuer, string app)
        {
            if(_accessTokenSettings.DisableAccesTokenGeneration)
            {
                return null;
            }

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
                    Expires = DateTime.UtcNow.AddSeconds(_accessTokenSettings.TokenExpirySeconds),
                    SigningCredentials = _signingKeysResolver.GetSigningCredentials(),
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

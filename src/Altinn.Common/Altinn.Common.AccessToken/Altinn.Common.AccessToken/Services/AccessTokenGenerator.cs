using Altinn.Common.AccessToken.Configuration;
using Altinn.Common.AccessToken.Constants;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace Altinn.Common.AccessToken.Services
{
    /// <summary>
    /// Access token generator creating access tokens for accessing platform components
    /// </summary>
    public class AccessTokenGenerator
    {
        private readonly AccessTokenSettings _accessTokenSettings;
        private readonly ISigningKeyResolver _signingKeysResolver;

        /// <summary>
        /// Default constructor. 
        /// </summary>
        /// <param name="accessTokenSettings"></param>
        /// <param name="signingKeysResolver"></param>
        public AccessTokenGenerator(IOptions<AccessTokenSettings> accessTokenSettings, ISigningKeyResolver signingKeysResolver)
        {
            _accessTokenSettings = accessTokenSettings.Value;
            _signingKeysResolver = signingKeysResolver;
        }

        /// <summary>
        /// Generates a access token for apps in altinn apps or platform components needing to access other platform components.
        /// </summary>
        /// <param name="org"></param>
        /// <param name="app"></param>
        /// <returns></returns>
        public string GenerateAccessToken(string org, string app)
        {
            List<Claim> claims = new List<Claim>();
            claims.Add(new Claim(AccessTokenClaimTypes.Org, org, ClaimValueTypes.String, org));
            claims.Add(new Claim(AccessTokenClaimTypes.Org, app, ClaimValueTypes.String, org));

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
                Issuer = org
            };

            SecurityToken token = tokenHandler.CreateToken(tokenDescriptor);
            string tokenstring = tokenHandler.WriteToken(token);

            return tokenstring;
        }
    }
}

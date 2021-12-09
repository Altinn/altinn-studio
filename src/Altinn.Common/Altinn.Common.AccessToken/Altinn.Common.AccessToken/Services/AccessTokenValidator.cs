using System;
using System.IdentityModel.Tokens.Jwt;
using System.Threading.Tasks;

using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;

namespace Altinn.Common.AccessToken.Services
{
    /// <summary>
    /// Service for access token validation
    /// </summary>
    public class AccessTokenValidator : IAccessTokenValidator
    {
        private readonly ISigningKeysResolver _signingKeysResolver;
        private readonly ILogger<IAccessTokenValidator> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="AccessTokenValidator"/> class.
        /// </summary>
        /// <param name="signingKeysResolver">The signing keys resolver</param>
        /// <param name="logger">The logger</param>
        public AccessTokenValidator(
            ISigningKeysResolver signingKeysResolver,
            ILogger<IAccessTokenValidator> logger)
        {
            _signingKeysResolver = signingKeysResolver;
            _logger = logger;
        }

        /// <inheritdoc/>
        public async Task<bool> Validate(string token)
        {
            JwtSecurityTokenHandler validator = new JwtSecurityTokenHandler();

            if (!validator.CanReadToken(token))
            {
                return false;
            }

            JwtSecurityToken jwt = validator.ReadJwtToken(token);
            TokenValidationParameters validationParameters = await GetTokenValidationParameters(jwt.Issuer);

            try
            {
                validator.ValidateToken(token, validationParameters, out _);
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogWarning("Failed to validate token.", ex);
            }

            return false;
        }

        private async Task<TokenValidationParameters> GetTokenValidationParameters(string issuer)
        {
            TokenValidationParameters tokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                ValidateIssuer = false,
                ValidateAudience = false,
                RequireExpirationTime = true,
                ValidateLifetime = true,
                ClockSkew = TimeSpan.Zero
            };

            tokenValidationParameters.IssuerSigningKeys = await _signingKeysResolver.GetSigningKeys(issuer);
            return tokenValidationParameters;
        }
    }
}

using System;
using System.IdentityModel.Tokens.Jwt;
using System.Threading.Tasks;
using Altinn.Common.AccessToken.Configuration;
using Altinn.Common.AccessToken.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Primitives;
using Microsoft.IdentityModel.Tokens;

namespace Altinn.Common.AccessToken
{
    /// <summary>
    /// Authorization handler to verify that request contains access token
    /// </summary>
    public class AccessTokenHandler : AuthorizationHandler<AccessTokenRequirement>
    {
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly ILogger _logger;
        private readonly AccessTokenSettings _accessTokenSettings;
        private readonly ISigningKeysResolver _signingKeysResolver;

        /// <summary>
        /// Default constructor
        /// </summary>
        /// <param name="httpContextAccessor">Default httpContext accessor</param>
        /// <param name="logger">The logger</param>
        /// <param name="accessTokenSettings">The access token settings</param>
        /// <param name="signingKeysResolver">The resolver for signing keys</param>
        public AccessTokenHandler(
            IHttpContextAccessor httpContextAccessor,
            ILogger<AccessTokenHandler> logger,
            IOptions<AccessTokenSettings> accessTokenSettings,
            ISigningKeysResolver signingKeysResolver)
        {
                _httpContextAccessor = httpContextAccessor;
                _logger = logger;
                _accessTokenSettings = accessTokenSettings.Value;
                _signingKeysResolver = signingKeysResolver;
        }

        /// <summary>
        /// Handles verification of AccessTokens. Enabled with Policy on API controllers 
        /// </summary>
        /// <param name="context">The context</param>
        /// <param name="requirement">The requirement for the given operation</param>
        /// <returns></returns>
        protected override async Task HandleRequirementAsync(AuthorizationHandlerContext context, AccessTokenRequirement requirement)
        {
            StringValues tokens = GetAccessTokens();
            if (tokens.Count != 1 && _accessTokenSettings.DisableAccessTokenVerification)
            {
                _logger.LogWarning("Token is missing and function is turned of");
                context.Succeed(requirement);
                return;
            }

            // It should only be one accesss token
            if (tokens.Count != 1)
            {
                _logger.LogWarning("Missing Access token");
                context.Fail();
                return;
            }

            bool isValid = false;
            try
            {
                _logger.LogWarning("Validating token");
                isValid = await ValidateAccessToken(tokens[0]);
                _logger.LogWarning("Token is validated");
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Validation of Access Token Failed");
                if (!_accessTokenSettings.DisableAccessTokenVerification)
                {
                    context.Fail();
                    return;
                }
                else
                {
                    context.Succeed(requirement);
                    return;
                }
            }

            if (isValid)
            {
                context.Succeed(requirement);
            }
            else
            {
                context.Fail();
            }
        }

        /// <summary>
        /// This validates the access token available in 
        /// </summary>
        /// <param name="token">The access token</param>
        /// <returns></returns>
        private async Task<bool> ValidateAccessToken(string token)
        {
            JwtSecurityTokenHandler validator = new JwtSecurityTokenHandler();

            if (!validator.CanReadToken(token))
            {
                return false;               
            }

            // Read JWT token to extract Issuer
            JwtSecurityToken jwt = validator.ReadJwtToken(token);
            TokenValidationParameters validationParameters = await GetTokenValidationParameters(jwt.Issuer);

            SecurityToken validatedToken;
            try
            {
                validator.ValidateToken(token, validationParameters, out validatedToken);
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

        private StringValues GetAccessTokens()
        {
            if (_httpContextAccessor.HttpContext.Request.Headers.ContainsKey(_accessTokenSettings.AccessTokenHeaderId))
            {
                return _httpContextAccessor.HttpContext.Request.Headers[_accessTokenSettings.AccessTokenHeaderId];
            }

            return StringValues.Empty;
        }
    }
}

using Altinn.Common.AccessToken.Configuration;
using Altinn.Common.AccessToken.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Primitives;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Microsoft.IdentityModel.Tokens;
using System;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Threading.Tasks;

namespace Altinn.Common.AccessToken
{
    public class AccessTokenHandler : AuthorizationHandler<AccessTokenRequirement>
    {
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly ILogger _logger;
        private readonly AccessTokenSettings _accessTokenSettings;
        private readonly ISigningKeysResolver _signingKeysResolver;

        public AccessTokenHandler(IHttpContextAccessor httpContextAccessor,
            ILogger<AccessTokenHandler> logger, IOptions<AccessTokenSettings> accessTokenSettings, ISigningKeysResolver signingKeysResolver)
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
            if (tokens.Count != 1 & _accessTokenSettings.DisableAccesTokenVerification)
            {
                context.Succeed(requirement);
                await Task.CompletedTask;
                return;
            }

            // It should only be one accesss token
            if (tokens.Count != 1)
            {
                context.Fail();
            }

            bool isValid = false;
            try
            {
                isValid = await ValidateAccessToken(tokens[0]);
            }
            catch(Exception ex)
            {
                _logger.LogWarning(ex, "Validation of Access Token Failed");
                if (!_accessTokenSettings.DisableAccesTokenVerification)
                {
                    context.Fail();
                }
                else
                {
                    context.Succeed(requirement);
                    await Task.CompletedTask;
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
        /// <param name="token"></param>
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

            ClaimsPrincipal principal;
            SecurityToken validatedToken;
            try
            {
                principal = validator.ValidateToken(token, validationParameters, out validatedToken);
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogInformation("Failed to validate token.", ex);
            }

            return false;
        }

        /// <summary>
        /// Gets 
        /// </summary>
        /// <param name="issuer"></param>
        /// <returns></returns>
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
          return _httpContextAccessor.HttpContext.Request.Headers[_accessTokenSettings.AccessTokenHeaderId];
        }
    }
}

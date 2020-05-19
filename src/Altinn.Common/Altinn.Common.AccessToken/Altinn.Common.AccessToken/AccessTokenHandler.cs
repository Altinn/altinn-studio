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
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;

namespace Altinn.Common.AccessToken
{
    public class AccessTokenHandler : AuthorizationHandler<AccessTokenRequirement>
    {
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly ILogger _logger;
        private readonly AccessTokenSettings _accessTokenSettings;
        private readonly ISigningKeysRetriever _signingKeysRetriever;

        public AccessTokenHandler(IHttpContextAccessor httpContextAccessor,
            ILogger<AccessTokenHandler> logger, IOptions<AccessTokenSettings> accessTokenSettings, ISigningKeysRetriever signingKeysRetriever)
        {
                _httpContextAccessor = httpContextAccessor;
                _logger = logger;
                _accessTokenSettings = accessTokenSettings.Value;
                _signingKeysRetriever = signingKeysRetriever;
        }


        protected override async Task HandleRequirementAsync(AuthorizationHandlerContext context, AccessTokenRequirement requirement)
        {
            StringValues tokens = GetAccessTokens();
            if (_accessTokenSettings.DisableAccesTokenVerification)
            {
                context.Succeed(requirement);
                await Task.CompletedTask;
            }

            if (tokens.Count != 1)
            {
                context.Fail();
            }

            bool isValid = await ValidateAccessToken(tokens[0]);
            if (isValid)
            {
                context.Succeed(requirement);
            }
            else
            {
                context.Fail();
            }
        }

        private async Task<bool> ValidateAccessToken(string token)
        {
            OpenIdConnectConfiguration configuration = GetOpenIDConfiguration();
            JwtSecurityTokenHandler validator = new JwtSecurityTokenHandler();

            if (!validator.CanReadToken(token))
            {
                return false;               
            }

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

        private OpenIdConnectConfiguration GetOpenIDConfiguration()
        {
            OpenIdConnectConfiguration openIdConnectConfiguration = new OpenIdConnectConfiguration();

            return openIdConnectConfiguration;
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

            tokenValidationParameters.IssuerSigningKeys = await _signingKeysRetriever.GetSigningKeys(issuer);
            return tokenValidationParameters;
        }


        private StringValues GetAccessTokens()
        {
          return _httpContextAccessor.HttpContext.Request.Headers[_accessTokenSettings.AccessTokenHeaderId];
        }
    }
}

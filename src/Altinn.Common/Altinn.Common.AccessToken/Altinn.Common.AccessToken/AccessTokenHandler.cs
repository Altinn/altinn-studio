using Altinn.Common.AccessToken.Configuration;
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

        public AccessTokenHandler(IHttpContextAccessor httpContextAccessor,
            ILogger<AccessTokenHandler> logger, IOptions<AccessTokenSettings> accessTokenSettings)
        {
                _httpContextAccessor = httpContextAccessor;
                _logger = logger;
                _accessTokenSettings = accessTokenSettings.Value;
        }


        protected override async Task HandleRequirementAsync(AuthorizationHandlerContext context, AccessTokenRequirement requirement)
        {
            StringValues tokens = GetAccessTokens();
            if (_accessTokenSettings.DisableAccesTokenVerification)
            {
                context.Succeed(requirement);
                await Task.CompletedTask;
            }

            if (tokens.Count == 0)
            {
                context.Fail();
            }

        }

        private bool ValidateAccessToken(string token)
        {
            TokenValidationParameters validationParameters = GetTokenValidationParameters();
            OpenIdConnectConfiguration configuration = GetOpenIDConfiguration();

            if (configuration != null)
            {
                string[] issuers = new[] { configuration.Issuer };
                validationParameters.ValidIssuers = validationParameters.ValidIssuers?.Concat(issuers) ?? issuers;

                validationParameters.IssuerSigningKeys =
                    validationParameters.IssuerSigningKeys?.Concat(configuration.SigningKeys) ?? configuration.SigningKeys;
            }
           
            JwtSecurityTokenHandler validator = new JwtSecurityTokenHandler();
            if (!validator.CanReadToken(token))
            {
               
            }

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

        private TokenValidationParameters GetTokenValidationParameters()
        {
            TokenValidationParameters tokenValidationParameters = new TokenValidationParameters();

            return tokenValidationParameters;
        }

        private StringValues GetAccessTokens()
        {
          return _httpContextAccessor.HttpContext.Request.Headers[_accessTokenSettings.AccessTokenHeaderId];
        }
    }
}

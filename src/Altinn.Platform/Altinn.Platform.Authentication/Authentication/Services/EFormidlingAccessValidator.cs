using System;
using System.IdentityModel.Tokens.Jwt;
using System.Threading.Tasks;

using Altinn.Common.AccessToken.Services;
using Altinn.Platform.Authentication.Model;
using Altinn.Platform.Authentication.Services.Interfaces;

using Microsoft.Extensions.Logging;

namespace Altinn.Platform.Authentication.Services
{
    /// <summary>
    /// Implementation of an eFormidling access validator
    /// </summary>
    public class EFormidlingAccessValidator : IEFormidlingAccessValidator
    {
        private readonly IAccessTokenValidator _validator;
        private readonly ILogger<IEFormidlingAccessValidator> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="EFormidlingAccessValidator"/> class.
        /// </summary>
        public EFormidlingAccessValidator(
            IAccessTokenValidator validator,
            ILogger<IEFormidlingAccessValidator> logger)
        {
            _validator = validator;
            _logger = logger;
        }

        /// <inheritdoc/>
        public async Task<IntrospectionResponse> ValidateToken(string token)
        {
            IntrospectionResponse result = new();
            bool isValid = false;

            try
            {
                isValid = await _validator.Validate(token);
            }
            catch (Exception ex)
            {
                _logger.LogInformation("// EFormidlingAccessTokenValidator // Token validation failed with exception {Exception}", ex);
            }

            if (isValid)
            {
                JwtSecurityTokenHandler tokenHandler = new JwtSecurityTokenHandler();
                JwtSecurityToken jwt = tokenHandler.ReadJwtToken(token);

                result.Active = true;
                result.Iss = jwt.Issuer;
            }

            return result;
        }
    }
}

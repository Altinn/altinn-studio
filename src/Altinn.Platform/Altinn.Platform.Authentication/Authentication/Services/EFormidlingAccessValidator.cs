using System.IdentityModel.Tokens.Jwt;
using System.Threading.Tasks;

using Altinn.Common.AccessToken.Services;
using Altinn.Platform.Authentication.Model;
using Altinn.Platform.Authentication.Services.Interfaces;

namespace Altinn.Platform.Authentication.Services
{
    /// <summary>
    /// Implementation of an eFormidling access validator
    /// </summary>
    public class EFormidlingAccessValidator : IEFormidlingAccessValidator
    {
        private readonly IAccessTokenValidator _validator;

        /// <summary>
        /// Initializes a new instance of the <see cref="EFormidlingAccessValidator"/> class.
        /// </summary>
        public EFormidlingAccessValidator(IAccessTokenValidator validator)
        {
            _validator = validator;
        }

        /// <inheritdoc/>
        public async Task<IntrospectionResponse> ValidateToken(string token)
        {
            IntrospectionResponse result = new();

            bool isValid = await _validator.Validate(token);

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

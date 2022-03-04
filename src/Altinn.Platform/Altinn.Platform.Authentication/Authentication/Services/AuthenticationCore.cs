using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

using Altinn.Platform.Authentication.Model;
using Altinn.Platform.Authentication.Services.Interfaces;

namespace Altinn.Platform.Authentication.Services
{
    /// <summary>
    /// Implementation of authentication business logic
    /// </summary>
    public class AuthenticationCore : IAuthentication
    {
        private readonly IEFormidlingAccessValidator _eFormidlingAccessValidator;

        /// <summary>
        /// Initializes a new instance of the <see cref="AuthenticationCore"/> class.
        /// </summary>
        public AuthenticationCore(IEFormidlingAccessValidator eFormidlingAccessValidator)
        {
            _eFormidlingAccessValidator = eFormidlingAccessValidator;
        }

        /// <inheritdoc/>
        public async Task<IntrospectionResponse> IntrospectionValidation(IntrospectionRequest request)
        {
            List<Func<Task<IntrospectionResponse>>> validationFunctions = new();
            validationFunctions.Add(async () => await ValidateEFormidlingAccessToken(request.Token));

            /*
             *  if token type hint is provided in the request,
             *  the suitable validation function should be moved to the top of the list
             *  to possibly avoid unnessesary validation attempts.
             */

            foreach (Func<Task<IntrospectionResponse>> func in validationFunctions)
            {
                var res = await func();

                if (res.Active)
                {
                    return res;
                }
            }

            return new IntrospectionResponse();
        }

        private async Task<IntrospectionResponse> ValidateEFormidlingAccessToken(string token)
        {
            return await _eFormidlingAccessValidator.ValidateToken(token);
        }
    }
}

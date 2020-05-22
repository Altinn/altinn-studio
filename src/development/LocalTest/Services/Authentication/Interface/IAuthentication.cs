using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace LocalTest.Services.Authentication.Interface
{
    public interface IAuthentication
    {
        /// <summary>
        /// Creates a JWT token based on claims principal.
        /// </summary>
        /// <param name="principal">The claims principal.</param>
        /// <param name="cookieValidityTime">Token validity time in minutes.</param>
        /// <returns></returns>
        public string GenerateToken(ClaimsPrincipal principal, int cookieValidityTime);
    }
}

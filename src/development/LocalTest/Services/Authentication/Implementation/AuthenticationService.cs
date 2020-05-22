using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
using System.Security.Cryptography.X509Certificates;
using System.Threading.Tasks;
using LocalTest.Services.Authentication.Interface;
using Microsoft.IdentityModel.Tokens;

namespace LocalTest.Services.Authentication.Implementation
{
    public class AuthenticationService : IAuthentication
    {
        ///<inheritdoc/>
        public string GenerateToken(ClaimsPrincipal principal, int cookieValidityTime)
        {
            List<X509Certificate2> certificates = new List<X509Certificate2> { new X509Certificate2("jwtselfsignedcert.pfx", "qwer1234") };

            TimeSpan tokenExpiry = new TimeSpan(0, cookieValidityTime, 0);

            JwtSecurityTokenHandler tokenHandler = new JwtSecurityTokenHandler();
            SecurityTokenDescriptor tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(principal.Identity),
                Expires = DateTime.UtcNow.AddSeconds(tokenExpiry.TotalSeconds),
                SigningCredentials = new X509SigningCredentials(certificates[0])
            };

            SecurityToken token = tokenHandler.CreateToken(tokenDescriptor);
            string serializedToken = tokenHandler.WriteToken(token);

            return serializedToken;
        }
    }
}

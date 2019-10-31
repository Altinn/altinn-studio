using System.Net.Http;
using System.Threading.Tasks;
using AltinnCore.Authentication.JwtCookie;
using AltinnCore.Authentication.Utils;
using AltinnCore.Common.Clients;
using AltinnCore.Common.Configuration;
using AltinnCore.Common.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace AltinnCore.Common.Services.Implementation
{
    /// <summary>
    /// Implementation for authentication service
    /// </summary>
    public class AuthenticationStudioSI : IAuthentication
    {
        /// <inheritdoc />
        public Task<string> RefreshToken()
        {
            throw new System.NotImplementedException();
        }
    }
}

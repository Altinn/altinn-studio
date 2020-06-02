using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Altinn.Common.AccessTokenClient.Services
{
    /// <summary>
    /// Access token generator interface
    /// </summary>
    public interface IAccessTokenGenerator
    {
        /// <summary>
        /// Generates a access token
        /// </summary>
        /// <param name="issuer">The issuer</param>
        /// <param name="app">The application id</param>
        /// <returns></returns>
        string GenerateAccessToken(string issuer, string app);
    }
}

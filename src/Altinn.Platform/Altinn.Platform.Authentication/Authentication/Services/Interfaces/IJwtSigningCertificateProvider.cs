using System.Collections.Generic;
using System.Security.Cryptography.X509Certificates;
using System.Threading.Tasks;

namespace Altinn.Platform.Authentication.Services.Interfaces
{
    /// <summary>
    /// Defines the methods to obtain a <see cref="X509Certificate2"/> instance that can be used when generating JSON Web Tokens.
    /// </summary>
    public interface IJwtSigningCertificateProvider
    {
        /// <summary>
        /// Get the current and previous version(s) of the JWT signing certificate.
        /// </summary>
        /// <returns>Identified <see cref="X509Certificate2"/>.</returns>
        Task<List<X509Certificate2>> GetCertificates();
    }
}

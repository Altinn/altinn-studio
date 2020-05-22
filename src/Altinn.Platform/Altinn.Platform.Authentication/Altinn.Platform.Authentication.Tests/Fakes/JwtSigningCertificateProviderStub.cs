using System.Collections.Generic;
using System.Security.Cryptography.X509Certificates;
using System.Threading.Tasks;

using Altinn.Platform.Authentication.Services.Interfaces;
using AltinnCore.Authentication.Constants;

using Microsoft.Extensions.Options;

namespace Altinn.Platform.Authentication.Tests.Fakes
{
    /// <summary>
    /// Represents an implementation of <see cref="IJwtSigningCertificateProvider"/> to be used in unit tests.
    /// </summary>
    public class JwtSigningCertificateProviderStub : IJwtSigningCertificateProvider
    {
        private readonly CertificateSettings _certificateSettings;

        /// <summary>
        /// Initialize a new instance of <see cref="JwtSigningCertificateProviderStub"/> with settings for accessing file system.
        /// </summary>
        /// <param name="certificateSettings">Settings required to access a certificate stored on a file system.</param>
        public JwtSigningCertificateProviderStub(IOptions<CertificateSettings> certificateSettings)
        {
            _certificateSettings = certificateSettings.Value;
        }

        /// <inheritdoc />
        public async Task<List<X509Certificate2>> GetCertificates()
        {
            X509Certificate2 cert = new X509Certificate2(_certificateSettings.CertificatePath, _certificateSettings.CertificatePwd);

            List<X509Certificate2> certificates = new List<X509Certificate2> { cert };

            return await Task.FromResult(certificates);
        }
    }
}

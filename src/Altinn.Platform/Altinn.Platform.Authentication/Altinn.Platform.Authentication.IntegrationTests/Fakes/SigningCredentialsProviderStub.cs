using System.Security.Cryptography.X509Certificates;
using System.Threading.Tasks;

using Altinn.Platform.Authentication.Services;
using AltinnCore.Authentication.Constants;

using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace Altinn.Platform.Authentication.IntegrationTests.Fakes
{
    /// <summary>
    /// Represents a fake version of <see cref="SigningCredentialsProvider"/> to be used in testing.
    /// </summary>
    public class SigningCredentialsProviderStub : ISigningCredentialsProvider
    {
        private readonly CertificateSettings _certificateSettings;

        /// <summary>
        /// Initialize a new instance of <see cref="SigningCredentialsProviderStub"/> with settings for accessing file system.
        /// </summary>
        /// <param name="certificateSettings">Settings required to access a certificate stored on a file system.</param>
        public SigningCredentialsProviderStub(IOptions<CertificateSettings> certificateSettings)
        {
            _certificateSettings = certificateSettings.Value;
        }

        /// <inheritdoc />
        public async Task<SigningCredentials> GetSigningCredentials()
        {
            X509Certificate2 cert = new X509Certificate2(_certificateSettings.CertificatePath, _certificateSettings.CertificatePwd);

            return await Task.FromResult(new X509SigningCredentials(cert, SecurityAlgorithms.RsaSha256));
        }
    }
}

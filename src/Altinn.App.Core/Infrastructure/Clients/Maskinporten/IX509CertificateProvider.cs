using System.Security.Cryptography.X509Certificates;

namespace Altinn.App.Core.Infrastructure.Clients.Maskinporten
{
    /// <summary>
    /// Provides a X509 certificate abstracted from the underlying implementation which
    /// will vary based on environment.
    /// </summary>
    public interface IX509CertificateProvider
    {
        /// <summary>
        /// Gets the certificate.
        /// </summary>
        Task<X509Certificate2> GetCertificate();
    }
}
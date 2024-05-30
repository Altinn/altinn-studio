using System.Security.Cryptography.X509Certificates;

namespace Altinn.App.Core.Infrastructure.Clients.Maskinporten;

/// <summary>
/// Provides a X509 certificate abstracted from the underlying implementation which
/// will vary based on environment.
/// </summary>
[Obsolete(
    "This should only have been used to get an accesstoken from Maskinporten, and has been replaced by IMaskinportenTokenProvider."
)]
public interface IX509CertificateProvider
{
    /// <summary>
    /// Gets the certificate.
    /// </summary>
    Task<X509Certificate2> GetCertificate();
}

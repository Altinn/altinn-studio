using System.Security.Cryptography.X509Certificates;
using Altinn.Common.AccessTokenClient.Services;

namespace Altinn.App.Core.Internal.Auth;

/// <summary>
/// The access token generator from <c>Altinn.Common.AccessTokenClient</c>, except on localtest: it has no signing
/// certificate and never checks the token, so the app sends none instead of logging a failed attempt on every call.
/// </summary>
internal sealed class PlatformAccessTokenGenerator(
    AccessTokenGenerator _generator,
    RuntimeEnvironment _runtimeEnvironment
) : IAccessTokenGenerator
{
    public string? GenerateAccessToken(string issuer, string app) =>
        _runtimeEnvironment.IsLocaltestPlatform() ? null : _generator.GenerateAccessToken(issuer, app);

    public string GenerateAccessToken(string issuer, string app, X509Certificate2 certificate) =>
        _generator.GenerateAccessToken(issuer, app, certificate);
}

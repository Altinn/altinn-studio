using System.Security.Cryptography;
using System.Text;

namespace Altinn.Studio.Observability.Proxy.Auth;

/// <summary>
/// A short, loggable name for a token: the first eight hex characters of its SHA-256.
///
/// During rotation an identity has two accepted tokens, and the source identity alone cannot say
/// which one a source presented. The tag can, without the log revealing the token. An operator
/// computes the same tag from the vault value with <c>printf %s "$token" | sha256sum | cut -c1-8</c>.
/// </summary>
internal static class TokenTag
{
    private const int Length = 8;

    public static string Of(string token)
    {
        return Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes(token)))[..Length];
    }
}

using System.Diagnostics.CodeAnalysis;
using System.Security.Cryptography;
using System.Text;

namespace Altinn.Studio.Preview.Sessions;

/// <summary>
/// The secret that names a preview session in its URLs. Whoever has it can read the session's working copy until the
/// session ends, so it is 128 bits from a cryptographic random generator, not a UUID, which RFC 9562 says not to use
/// as a capability.
/// </summary>
internal readonly record struct SessionId
{
    /// <summary>128 bits as lowercase hex, which a URL path carries unchanged.</summary>
    public const int Length = 32;

    private SessionId(string value) => Value = value;

    public string Value { get; }

    /// <summary>
    /// The Redis key the session is kept under: a hash of the ID, so a copy of Redis holds no ID that opens a session.
    /// </summary>
    public string StorageKey => Convert.ToHexStringLower(SHA256.HashData(Encoding.ASCII.GetBytes(Value)));

    public static SessionId New() => new(RandomNumberGenerator.GetHexString(Length, lowercase: true));

    public static bool TryParse([NotNullWhen(true)] string? value, out SessionId sessionId)
    {
        sessionId = default;
        if (value is not { Length: Length } || !value.All(char.IsAsciiHexDigitLower))
        {
            return false;
        }

        sessionId = new SessionId(value);
        return true;
    }

    public override string ToString() => Value;
}

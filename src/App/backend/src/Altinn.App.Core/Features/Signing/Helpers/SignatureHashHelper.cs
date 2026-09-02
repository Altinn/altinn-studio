using System.Security.Cryptography;

namespace Altinn.App.Core.Features.Signing.Helpers;

/// <summary>
/// Hashes the bytes of a signed data element as lowercase hexadecimal SHA-256 without delimiters.
/// </summary>
/// <remarks>
/// Storage's <c>DataService.FormatShaDigest</c> produces the same string when it creates a signature document, and the two must stay in sync.
/// </remarks>
internal static class SignatureHashHelper
{
    internal static async Task<string> GenerateSha256Hash(Stream stream, CancellationToken cancellationToken = default)
    {
        byte[] digest = await SHA256.HashDataAsync(stream, cancellationToken);
        return Convert.ToHexStringLower(digest);
    }

    internal static string GenerateSha256Hash(ReadOnlySpan<byte> bytes)
    {
        return Convert.ToHexStringLower(SHA256.HashData(bytes));
    }
}

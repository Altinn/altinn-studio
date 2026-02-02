#nullable enable
using System.Buffers.Text;
using System.Diagnostics;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Altinn.Platform.Storage.Models;

/// <summary>
/// Represents the data encoded in an instance lock token.
/// </summary>
/// <remarks>
/// Creates a new instance of <see cref="LockToken"/> with the specified id and secret.
/// </remarks>
/// <param name="id">The lock identifier.</param>
/// <param name="secret">The lock secret.</param>
public sealed class LockToken(Guid id, byte[] secret)
{
    /// <summary>
    /// Gets lock identifier.
    /// </summary>
    [JsonPropertyName("id")]
    public Guid Id { get; init; } = id;

    /// <summary>
    /// Gets the lock secret.
    /// </summary>
    [JsonPropertyName("secret")]
    public byte[] Secret { get; init; } = secret;

    /// <summary>
    /// Creates the encoded lock token string.
    /// </summary>
    /// <returns>The base64url-encoded lock token.</returns>
    public string CreateToken()
    {
        var jsonBytes = JsonSerializer.SerializeToUtf8Bytes(this);
        return Base64Url.EncodeToString(jsonBytes);
    }

    /// <summary>
    /// Parses a lock token string.
    /// </summary>
    /// <param name="token">The lock token string to parse.</param>
    /// <returns>The parsed token data.</returns>
    /// <exception cref="FormatException">Thrown when the lock token format is invalid.</exception>
    public static LockToken ParseToken(string token)
    {
        var jsonBytes = new byte[Base64Url.GetMaxDecodedLength(token.Length)];
        int bytesWritten;
        try
        {
            if (!Base64Url.TryDecodeFromChars(token, jsonBytes, out bytesWritten))
            {
                throw new UnreachableException();
            }
        }
        catch (FormatException)
        {
            throw new FormatException("Invalid Base64Url character in string.");
        }

        LockToken? tokenData;
        try
        {
            tokenData = JsonSerializer.Deserialize<LockToken>(jsonBytes.AsSpan(0, bytesWritten));
        }
        catch (JsonException)
        {
            throw new FormatException("Could not deserialize JSON.");
        }
        if (
            tokenData is null
            || tokenData.Secret is null
            || tokenData.Secret.Length == 0
            || tokenData.Id == Guid.Empty
        )
        {
            throw new FormatException("JSON did not contain required data.");
        }

        return tokenData;
    }
}

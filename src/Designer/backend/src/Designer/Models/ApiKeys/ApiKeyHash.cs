using System;
using System.Security.Cryptography;
using System.Text;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Helpers;

namespace Altinn.Studio.Designer.Models.ApiKey;

public readonly record struct ApiKeyHash
{
    public string Value { get; }

    private ApiKeyHash(string value)
    {
        Value = value;
    }

    public static ApiKeyHash FromRawKey(string rawKey, string salt)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(rawKey);
        ArgumentException.ThrowIfNullOrWhiteSpace(salt);

        byte[] bytes = SHA256.HashData(Encoding.UTF8.GetBytes(salt + rawKey));
        return new ApiKeyHash(Convert.ToHexStringLower(bytes));
    }

    public static ApiKeyHash FromRawKey(string rawKey, ApiKeySettings settings)
    {
        return FromRawKey(rawKey, settings.HashSalt);
    }

    public static ApiKeyHash FromHashedValue(string hashedValue)
    {
        if (!AltinnRegexes.Sha256HexRegex().IsMatch(hashedValue))
        {
            throw new ArgumentException(
                "Hashed value must be exactly 64 lowercase hex characters.",
                nameof(hashedValue)
            );
        }

        return new ApiKeyHash(hashedValue);
    }

    public override string ToString() => Value;
}

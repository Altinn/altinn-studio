using System;
using System.Security.Cryptography;
using System.Text;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Helpers;

namespace Altinn.Studio.Designer.Models;

public readonly record struct PidHash
{
    public string Value { get; }

    private PidHash(string value)
    {
        Value = value;
    }

    public static PidHash FromPid(string pid, string salt)
    {
        if (!AltinnRegexes.NorwegianPidRegex().IsMatch(pid))
        {
            throw new ArgumentException("PID must be exactly 11 digits.", nameof(pid));
        }

        ArgumentException.ThrowIfNullOrWhiteSpace(salt);

        byte[] bytes = SHA256.HashData(Encoding.UTF8.GetBytes(salt + pid));
        return new PidHash(Convert.ToHexStringLower(bytes));
    }

    public static PidHash FromPid(string pid, DeveloperMappingSettings settings)
    {
        return FromPid(pid, settings.PidHashSalt);
    }

    public static PidHash FromHashedValue(string hashedValue)
    {
        if (!AltinnRegexes.Sha256HexRegex().IsMatch(hashedValue))
        {
            throw new ArgumentException(
                "Hashed value must be exactly 64 lowercase hex characters.",
                nameof(hashedValue)
            );
        }

        return new PidHash(hashedValue);
    }

    public override string ToString() => Value;
}

using System;
using System.Collections.Generic;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Enums;
using Altinn.Studio.Designer.Repository;
using Altinn.Studio.Designer.Repository.ORMImplementation.Models;
using Altinn.Studio.Designer.Services.Interfaces;

namespace Altinn.Studio.Designer.Services.Implementation;

public class PersonalAccessTokenService(
    IPersonalAccessTokenRepository repository,
    PersonalAccessTokenSettings settings,
    TimeProvider timeProvider) : IPersonalAccessTokenService
{
    private const int RawKeyLengthBytes = 32;

    public async Task<(string RawKey, PersonalAccessTokenDbModel Model)> CreateAsync(
        Guid userAccountId,
        string displayName,
        PersonalAccessTokenType tokenType,
        DateTimeOffset expiresAt,
        CancellationToken cancellationToken = default)
    {
        int maxExpiry = settings.MaxExpiryDays;
        DateTimeOffset maxAllowed = timeProvider.GetUtcNow().AddDays(maxExpiry);
        if (expiresAt > maxAllowed)
        {
            throw new ArgumentException($"Expiry cannot exceed {maxExpiry} days.");
        }

        string rawKey = GenerateRawKey();
        string keyHash = ComputeHash(rawKey);

        var model = new PersonalAccessTokenDbModel
        {
            KeyHash = keyHash,
            UserAccountId = userAccountId,
            DisplayName = displayName,
            TokenType = tokenType,
            ExpiresAt = expiresAt,
            Revoked = false,
            CreatedAt = timeProvider.GetUtcNow()
        };

        var created = await repository.CreateAsync(model, cancellationToken);
        return (rawKey, created);
    }

    public async Task<PersonalAccessTokenDbModel?> ValidateAsync(string rawKey, CancellationToken cancellationToken = default)
    {
        string keyHash = ComputeHash(rawKey);
        var model = await repository.GetByKeyHashAsync(keyHash, cancellationToken);

        if (model is null)
        {
            return null;
        }

        if (model.Revoked || model.ExpiresAt <= timeProvider.GetUtcNow())
        {
            return null;
        }

        return model;
    }

    public Task<List<PersonalAccessTokenDbModel>> ListByUserAccountIdAsync(Guid userAccountId, PersonalAccessTokenType? tokenType = null, CancellationToken cancellationToken = default)
    {
        return repository.GetByUserAccountIdAsync(userAccountId, tokenType, cancellationToken);
    }

    public Task RevokeAsync(long id, Guid userAccountId, CancellationToken cancellationToken = default)
    {
        return repository.RevokeAsync(id, userAccountId, cancellationToken);
    }

    private string ComputeHash(string rawKey)
    {
        byte[] bytes = SHA256.HashData(Encoding.UTF8.GetBytes(settings.HashSalt + rawKey));
        return Convert.ToHexStringLower(bytes);
    }

    private static string GenerateRawKey()
    {
        byte[] keyBytes = RandomNumberGenerator.GetBytes(RawKeyLengthBytes);
        return Convert.ToBase64String(keyBytes)
            .Replace("+", "-")
            .Replace("/", "_")
            .TrimEnd('=');
    }
}

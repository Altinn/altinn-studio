using System;
using System.Collections.Generic;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Enums;
using Altinn.Studio.Designer.Exceptions.PersonalAccessToken;
using Altinn.Studio.Designer.Repository;
using Altinn.Studio.Designer.Repository.ORMImplementation.Data;
using Altinn.Studio.Designer.Repository.ORMImplementation.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Altinn.Studio.Designer.Services.Implementation;

public class PersonalAccessTokenService(
    IPersonalAccessTokenRepository repository,
    DesignerdbContext dbContext,
    PersonalAccessTokenSettings settings,
    TimeProvider timeProvider
) : IPersonalAccessTokenService
{
    private const int RawKeyLengthBytes = 32;

    public async Task<(string RawKey, PersonalAccessTokenDbModel Model)> CreateAsync(
        string username,
        string name,
        PersonalAccessTokenType tokenType,
        DateTimeOffset expiresAt,
        CancellationToken cancellationToken = default
    )
    {
        int maxExpiry = settings.MaxExpiryDays;
        DateTimeOffset maxAllowed = timeProvider.GetUtcNow().AddDays(maxExpiry);
        if (expiresAt > maxAllowed)
        {
            throw new ArgumentException($"Expiry cannot exceed {maxExpiry} days.");
        }

        Guid userAccountId = await ResolveUserAccountIdAsync(username, cancellationToken);

        bool nameExists = await dbContext
            .PersonalAccessTokens.AsNoTracking()
            .AnyAsync(t => t.UserAccountId == userAccountId && t.Name == name && !t.Revoked, cancellationToken);

        if (nameExists)
        {
            throw new DuplicateTokenNameException($"A non-revoked token with name '{name}' already exists.");
        }

        string rawKey = GenerateRawKey();
        string keyHash = ComputeHash(rawKey);

        var model = new PersonalAccessTokenDbModel
        {
            KeyHash = keyHash,
            UserAccountId = userAccountId,
            Name = name,
            TokenType = tokenType,
            ExpiresAt = expiresAt,
            Revoked = false,
            CreatedAt = timeProvider.GetUtcNow(),
        };

        var created = await repository.CreateAsync(model, cancellationToken);
        return (rawKey, created);
    }

    public async Task<PersonalAccessTokenDbModel?> ValidateAsync(
        string rawKey,
        CancellationToken cancellationToken = default
    )
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

    public async Task<List<PersonalAccessTokenDbModel>> ListAsync(
        string username,
        PersonalAccessTokenType? tokenType = null,
        CancellationToken cancellationToken = default
    )
    {
        Guid userAccountId = await ResolveUserAccountIdAsync(username, cancellationToken);
        return await repository.GetByUserAccountIdAsync(userAccountId, tokenType, cancellationToken);
    }

    public async Task RevokeAsync(long id, string username, CancellationToken cancellationToken = default)
    {
        Guid userAccountId = await ResolveUserAccountIdAsync(username, cancellationToken);
        await repository.RevokeAsync(id, userAccountId, cancellationToken);
    }

    private async Task<Guid> ResolveUserAccountIdAsync(string username, CancellationToken cancellationToken)
    {
        var userAccount = await dbContext
            .UserAccounts.AsNoTracking()
            .FirstOrDefaultAsync(u => u.Username == username, cancellationToken);

        if (userAccount is null)
        {
            throw new InvalidOperationException($"User account not found for username '{username}'.");
        }

        return userAccount.Id;
    }

    private string ComputeHash(string rawKey)
    {
        byte[] bytes = SHA256.HashData(Encoding.UTF8.GetBytes(settings.HashSalt + rawKey));
        return Convert.ToHexStringLower(bytes);
    }

    private static string GenerateRawKey()
    {
        byte[] keyBytes = RandomNumberGenerator.GetBytes(RawKeyLengthBytes);
        return Convert.ToBase64String(keyBytes).Replace("+", "-").Replace("/", "_").TrimEnd('=');
    }
}

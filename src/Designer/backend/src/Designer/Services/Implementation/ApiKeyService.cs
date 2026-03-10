using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Exceptions.ApiKey;
using Altinn.Studio.Designer.Models.ApiKey;
using Altinn.Studio.Designer.Repository;
using Altinn.Studio.Designer.Repository.ORMImplementation.Data;
using Altinn.Studio.Designer.Repository.ORMImplementation.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Altinn.Studio.Designer.Services.Implementation;

public class ApiKeyService(
    IApiKeyRepository repository,
    DesignerdbContext dbContext,
    ApiKeySettings settings,
    TimeProvider timeProvider
) : IApiKeyService
{
    private const int RawKeyLengthBytes = 32;

    public async Task<(string RawKey, ApiKey ApiKey)> CreateAsync(
        string username,
        string name,
        ApiKeyType tokenType,
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
            .ApiKeys.AsNoTracking()
            .AnyAsync(t => t.UserAccountId == userAccountId && t.Name == name && !t.Revoked, cancellationToken);

        if (nameExists)
        {
            throw new DuplicateTokenNameException($"A non-revoked token with name '{name}' already exists.");
        }

        string rawKey = GenerateRawKey();
        ApiKeyHash keyHash = ApiKeyHash.FromRawKey(rawKey, settings);

        var model = new ApiKeyDbModel
        {
            KeyHash = keyHash.Value,
            UserAccountId = userAccountId,
            Name = name,
            TokenType = tokenType,
            ExpiresAt = expiresAt,
            Revoked = false,
            CreatedAt = timeProvider.GetUtcNow(),
        };

        var created = await repository.CreateAsync(model, cancellationToken);
        return (rawKey, MapToDomain(created, username));
    }

    public async Task<ApiKey?> ValidateAsync(string rawKey, CancellationToken cancellationToken = default)
    {
        ApiKeyHash keyHash = ApiKeyHash.FromRawKey(rawKey, settings);
        var model = await repository.GetByKeyHashAsync(keyHash.Value, cancellationToken);

        if (model is null)
        {
            return null;
        }

        if (model.Revoked || model.ExpiresAt <= timeProvider.GetUtcNow())
        {
            return null;
        }

        return MapToDomain(model, model.UserAccount.Username);
    }

    public async Task<List<ApiKey>> ListAsync(
        string username,
        ApiKeyType? tokenType = null,
        CancellationToken cancellationToken = default
    )
    {
        Guid userAccountId = await ResolveUserAccountIdAsync(username, cancellationToken);
        var models = await repository.GetByUserAccountIdAsync(userAccountId, tokenType, cancellationToken);
        return models.Select(m => MapToDomain(m, username)).ToList();
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

    private static ApiKey MapToDomain(ApiKeyDbModel model, string username) =>
        new()
        {
            Id = model.Id,
            Name = model.Name,
            TokenType = model.TokenType,
            ExpiresAt = model.ExpiresAt,
            CreatedAt = model.CreatedAt,
            Username = username,
        };

    private static string GenerateRawKey()
    {
        byte[] keyBytes = RandomNumberGenerator.GetBytes(RawKeyLengthBytes);
        return Convert.ToBase64String(keyBytes).Replace("+", "-").Replace("/", "_").TrimEnd('=');
    }
}

using System;
using System.Collections.Generic;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Repository;
using Altinn.Studio.Designer.Repository.ORMImplementation.Models;
using Altinn.Studio.Designer.Services.Interfaces;

namespace Altinn.Studio.Designer.Services.Implementation;

public class ApiKeyService : IApiKeyService
{
    private const int RawKeyLengthBytes = 32;

    private readonly IApiKeyRepository _repository;
    private readonly ApiKeySettings _settings;
    private readonly TimeProvider _timeProvider;

    public ApiKeyService(IApiKeyRepository repository, ApiKeySettings settings, TimeProvider timeProvider)
    {
        _repository = repository;
        _settings = settings;
        _timeProvider = timeProvider;
    }

    public async Task<(string RawKey, ApiKeyDbModel Model)> CreateAsync(
        string username,
        string displayName,
        DateTimeOffset expiresAt,
        CancellationToken cancellationToken = default)
    {
        int maxExpiry = _settings.MaxExpiryDays;
        DateTimeOffset maxAllowed = _timeProvider.GetUtcNow().AddDays(maxExpiry);
        if (expiresAt > maxAllowed)
        {
            throw new ArgumentException($"Expiry cannot exceed {maxExpiry} days.");
        }

        string rawKey = GenerateRawKey();
        string keyHash = ComputeHash(rawKey);

        var model = new ApiKeyDbModel
        {
            KeyHash = keyHash,
            Username = username,
            DisplayName = displayName,
            ExpiresAt = expiresAt,
            Revoked = false,
            CreatedAt = _timeProvider.GetUtcNow()
        };

        var created = await _repository.CreateAsync(model, cancellationToken);
        return (rawKey, created);
    }

    public async Task<ApiKeyDbModel?> ValidateAsync(string rawKey, CancellationToken cancellationToken = default)
    {
        string keyHash = ComputeHash(rawKey);
        var model = await _repository.GetByKeyHashAsync(keyHash, cancellationToken);

        if (model is null)
        {
            return null;
        }

        if (model.Revoked || model.ExpiresAt <= _timeProvider.GetUtcNow())
        {
            return null;
        }

        return model;
    }

    public Task<List<ApiKeyDbModel>> ListByUsernameAsync(string username, CancellationToken cancellationToken = default)
    {
        return _repository.GetByUsernameAsync(username, cancellationToken);
    }

    public Task RevokeAsync(long id, string username, CancellationToken cancellationToken = default)
    {
        return _repository.RevokeAsync(id, username, cancellationToken);
    }

    private string ComputeHash(string rawKey)
    {
        byte[] bytes = SHA256.HashData(Encoding.UTF8.GetBytes(_settings.HashSalt + rawKey));
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

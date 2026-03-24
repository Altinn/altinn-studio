using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models.ApiKey;

namespace Altinn.Studio.Designer.Services.Interfaces;

public interface IApiKeyService
{
    Task<(string RawKey, ApiKey ApiKey)> CreateAsync(
        string username,
        string name,
        ApiKeyType tokenType,
        DateTimeOffset expiresAt,
        CancellationToken cancellationToken = default
    );
    Task<ApiKey?> ValidateAsync(string rawKey, CancellationToken cancellationToken = default);
    Task<List<ApiKey>> ListAsync(
        string username,
        ApiKeyType? tokenType = null,
        CancellationToken cancellationToken = default
    );
    Task RevokeAsync(long id, string username, CancellationToken cancellationToken = default);
}

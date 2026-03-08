using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Enums;
using Altinn.Studio.Designer.Repository.ORMImplementation.Models;

namespace Altinn.Studio.Designer.Services.Interfaces;

public interface IApiKeyService
{
    Task<(string RawKey, ApiKeyDbModel Model)> CreateAsync(
        string username,
        string name,
        ApiKeyType tokenType,
        System.DateTimeOffset expiresAt,
        CancellationToken cancellationToken = default
    );
    Task<ApiKeyDbModel?> ValidateAsync(string rawKey, CancellationToken cancellationToken = default);
    Task<List<ApiKeyDbModel>> ListAsync(
        string username,
        ApiKeyType? tokenType = null,
        CancellationToken cancellationToken = default
    );
    Task RevokeAsync(long id, string username, CancellationToken cancellationToken = default);
}

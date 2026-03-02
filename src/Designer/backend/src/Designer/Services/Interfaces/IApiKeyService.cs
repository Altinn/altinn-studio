using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Repository.ORMImplementation.Models;

namespace Altinn.Studio.Designer.Services.Interfaces;

public interface IApiKeyService
{
    Task<(string RawKey, ApiKeyDbModel Model)> CreateAsync(string username, string displayName, DateTimeOffset expiresAt, CancellationToken cancellationToken = default);
    Task<ApiKeyDbModel?> ValidateAsync(string rawKey, CancellationToken cancellationToken = default);
    Task<List<ApiKeyDbModel>> ListByUsernameAsync(string username, CancellationToken cancellationToken = default);
    Task RevokeAsync(long id, string username, CancellationToken cancellationToken = default);
}

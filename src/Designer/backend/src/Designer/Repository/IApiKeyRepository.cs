using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Enums;
using Altinn.Studio.Designer.Repository.ORMImplementation.Models;

namespace Altinn.Studio.Designer.Repository;

public interface IApiKeyRepository
{
    Task<ApiKeyDbModel?> GetByKeyHashAsync(string keyHash, CancellationToken cancellationToken = default);
    Task<List<ApiKeyDbModel>> GetByUserAccountIdAsync(
        Guid userAccountId,
        ApiKeyType? tokenType = null,
        CancellationToken cancellationToken = default
    );
    Task<ApiKeyDbModel> CreateAsync(ApiKeyDbModel model, CancellationToken cancellationToken = default);
    Task RevokeAsync(long id, Guid userAccountId, CancellationToken cancellationToken = default);
}

using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Enums;
using Altinn.Studio.Designer.Repository.ORMImplementation.Models;

namespace Altinn.Studio.Designer.Repository;

public interface IPersonalAccessTokenRepository
{
    Task<PersonalAccessTokenDbModel?> GetByKeyHashAsync(string keyHash, CancellationToken cancellationToken = default);
    Task<List<PersonalAccessTokenDbModel>> GetByUserAccountIdAsync(
        Guid userAccountId,
        PersonalAccessTokenType? tokenType = null,
        CancellationToken cancellationToken = default
    );
    Task<PersonalAccessTokenDbModel> CreateAsync(
        PersonalAccessTokenDbModel model,
        CancellationToken cancellationToken = default
    );
    Task RevokeAsync(long id, Guid userAccountId, CancellationToken cancellationToken = default);
}

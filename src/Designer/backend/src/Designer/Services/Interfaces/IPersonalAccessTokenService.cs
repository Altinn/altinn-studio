using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Enums;
using Altinn.Studio.Designer.Repository.ORMImplementation.Models;

namespace Altinn.Studio.Designer.Services.Interfaces;

public interface IPersonalAccessTokenService
{
    Task<(string RawKey, PersonalAccessTokenDbModel Model)> CreateAsync(Guid userAccountId, string displayName, PersonalAccessTokenType tokenType, DateTimeOffset expiresAt, CancellationToken cancellationToken = default);
    Task<PersonalAccessTokenDbModel?> ValidateAsync(string rawKey, CancellationToken cancellationToken = default);
    Task<List<PersonalAccessTokenDbModel>> ListByUserAccountIdAsync(Guid userAccountId, PersonalAccessTokenType? tokenType = null, CancellationToken cancellationToken = default);
    Task RevokeAsync(long id, Guid userAccountId, CancellationToken cancellationToken = default);
}

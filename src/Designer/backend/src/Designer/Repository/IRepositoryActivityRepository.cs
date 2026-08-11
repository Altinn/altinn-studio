using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Repository.Models.RepositoryActivity;

namespace Altinn.Studio.Designer.Repository;

public interface IRepositoryActivityRepository
{
    Task MarkActiveAsync(
        AltinnRepoEditingContext editingContext,
        DateTimeOffset lastAccessedAt,
        CancellationToken cancellationToken = default
    );

    Task<IReadOnlyCollection<RepositoryActivityEntity>> GetAllAsync(CancellationToken cancellationToken = default);

    Task<RepositoryActivityEntity?> GetAsync(
        AltinnRepoEditingContext editingContext,
        CancellationToken cancellationToken = default
    );

    Task<bool> TryMarkCleanupPendingAsync(
        AltinnRepoEditingContext editingContext,
        DateTimeOffset expectedLastAccessedAt,
        CancellationToken cancellationToken = default
    );

    Task RemoveAsync(AltinnRepoEditingContext editingContext, CancellationToken cancellationToken = default);
}

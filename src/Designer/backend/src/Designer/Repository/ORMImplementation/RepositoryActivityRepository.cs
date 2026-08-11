using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Repository.Models.RepositoryActivity;
using Altinn.Studio.Designer.Repository.ORMImplementation.Data;
using Altinn.Studio.Designer.Repository.ORMImplementation.Models;
using Microsoft.EntityFrameworkCore;

namespace Altinn.Studio.Designer.Repository.ORMImplementation;

public class RepositoryActivityRepository(DesignerdbContext dbContext) : IRepositoryActivityRepository
{
    public Task MarkActiveAsync(
        AltinnRepoEditingContext editingContext,
        DateTimeOffset lastAccessedAt,
        CancellationToken cancellationToken = default
    ) =>
        dbContext.Database.ExecuteSqlInterpolatedAsync(
            $"""
            INSERT INTO designer.repository_activity
                (developer, org, repository, last_accessed_at, cleanup_pending)
            VALUES
                ({editingContext.Developer}, {editingContext.Org}, {editingContext.Repo}, {lastAccessedAt}, FALSE)
            ON CONFLICT (developer, org, repository) DO UPDATE
            SET last_accessed_at = GREATEST(
                    repository_activity.last_accessed_at,
                    EXCLUDED.last_accessed_at
                ),
                cleanup_pending = FALSE;
            """,
            cancellationToken
        );

    public async Task<IReadOnlyCollection<RepositoryActivityEntity>> GetAllAsync(
        CancellationToken cancellationToken = default
    )
    {
        RepositoryActivityDbModel[] dbModels = await dbContext
            .RepositoryActivities.AsNoTracking()
            .ToArrayAsync(cancellationToken);
        return dbModels.Select(MapToEntity).ToArray();
    }

    public async Task<RepositoryActivityEntity?> GetAsync(
        AltinnRepoEditingContext editingContext,
        CancellationToken cancellationToken = default
    )
    {
        RepositoryActivityDbModel? dbModel = await dbContext
            .RepositoryActivities.AsNoTracking()
            .SingleOrDefaultAsync(
                activity =>
                    activity.Developer == editingContext.Developer
                    && activity.Org == editingContext.Org
                    && activity.Repository == editingContext.Repo,
                cancellationToken
            );
        return dbModel is null ? null : MapToEntity(dbModel);
    }

    public async Task<bool> TryMarkCleanupPendingAsync(
        AltinnRepoEditingContext editingContext,
        DateTimeOffset expectedLastAccessedAt,
        CancellationToken cancellationToken = default
    )
    {
        int affectedRows = await dbContext.Database.ExecuteSqlInterpolatedAsync(
            $"""
            INSERT INTO designer.repository_activity
                (developer, org, repository, last_accessed_at, cleanup_pending)
            VALUES
                ({editingContext.Developer}, {editingContext.Org}, {editingContext.Repo}, {expectedLastAccessedAt}, TRUE)
            ON CONFLICT (developer, org, repository) DO UPDATE
            SET cleanup_pending = TRUE
            WHERE repository_activity.last_accessed_at <= EXCLUDED.last_accessed_at;
            """,
            cancellationToken
        );
        return affectedRows > 0;
    }

    public Task RemoveAsync(AltinnRepoEditingContext editingContext, CancellationToken cancellationToken = default) =>
        dbContext
            .RepositoryActivities.Where(activity =>
                activity.Developer == editingContext.Developer
                && activity.Org == editingContext.Org
                && activity.Repository == editingContext.Repo
            )
            .ExecuteDeleteAsync(cancellationToken);

    private static RepositoryActivityEntity MapToEntity(RepositoryActivityDbModel dbModel) =>
        new(
            AltinnRepoEditingContext.FromOrgRepoDeveloper(dbModel.Org, dbModel.Repository, dbModel.Developer),
            dbModel.LastAccessedAt,
            dbModel.CleanupPending
        );
}

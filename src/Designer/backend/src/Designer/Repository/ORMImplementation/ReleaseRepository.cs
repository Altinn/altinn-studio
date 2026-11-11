#nullable disable
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.Repository.ORMImplementation.Data;
using Altinn.Studio.Designer.Repository.ORMImplementation.Mappers;
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps.Enums;
using Altinn.Studio.Designer.ViewModels.Request;
using Altinn.Studio.Designer.ViewModels.Request.Enums;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using NpgsqlTypes;

namespace Altinn.Studio.Designer.Repository.ORMImplementation;

public class ReleaseRepository : IReleaseRepository
{
    private const string SucceededReleasesSql = """
        SELECT DISTINCT ON (r.org, r.app, r.tagname) r.*
        FROM designer.releases AS r
        JOIN unnest(@orgs, @apps, @tag_names) AS requested(org, app, tagname)
            ON r.org = requested.org AND r.app = requested.app AND r.tagname = requested.tagname
        WHERE r.buildresult = @succeeded
        ORDER BY r.org, r.app, r.tagname, r.created DESC, r.sequenceno DESC
        """;

    private readonly DesignerdbContext _dbContext;

    public ReleaseRepository(DesignerdbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<ReleaseEntity> Create(ReleaseEntity releaseEntity)
    {
        var dbObject = ReleaseMapper.MapToDbModel(releaseEntity);
        _dbContext.Releases.Add(dbObject);
        await _dbContext.SaveChangesAsync();
        return releaseEntity;
    }

    public async Task<IEnumerable<ReleaseEntity>> Get(string org, string app, DocumentQueryModel query)
    {
        var releasesQuery = _dbContext.Releases.AsNoTracking().Where(x => x.Org == org && x.App == app);

        releasesQuery =
            query.SortDirection == SortDirection.Descending
                ? releasesQuery.OrderByDescending(r => r.Created)
                : releasesQuery.OrderBy(r => r.Created);

        releasesQuery = releasesQuery.Take(query.Top ?? int.MaxValue);

        var dbObjects = await releasesQuery.ToListAsync();
        return ReleaseMapper.MapToModels(dbObjects);
    }

    public async Task<IEnumerable<ReleaseEntity>> Get(
        string org,
        string app,
        string tagName,
        List<string> buildStatus,
        List<string> buildResult
    )
    {
        var query = _dbContext.Releases.Where(r => r.Org == org && r.App == app && r.Tagname == tagName);

        query = query.Where(r =>
            (buildStatus != null && buildStatus.Any(bs => r.Buildstatus.Equals(bs)))
            || (buildResult != null && buildResult.Any(br => r.Buildresult.Equals(br)))
        );

        var dbObjects = await query.ToListAsync();
        return ReleaseMapper.MapToModels(dbObjects);
    }

    public async Task<IEnumerable<ReleaseEntity>> Get(string org, string buildId)
    {
        var dbObjects = await _dbContext
            .Releases.AsNoTracking()
            .Where(r => r.Org == org && r.Buildid == buildId)
            .ToListAsync();
        return ReleaseMapper.MapToModels(dbObjects);
    }

    public async Task<ReleaseEntity> GetSucceededReleaseFromDb(string org, string app, string tagName)
    {
        List<string> buildResultFilter = [BuildResult.Succeeded.ToEnumMemberAttributeValue()];

        IEnumerable<ReleaseEntity> releases = await Get(org, app, tagName, null, buildResultFilter);
        return releases.Single();
    }

    public async Task<IReadOnlyList<ReleaseEntity>> GetSucceededReleases(
        IReadOnlyCollection<ReleaseLookupKey> keys,
        CancellationToken cancellationToken
    )
    {
        if (keys.Count == 0)
        {
            return [];
        }

        // The keys are joined as parallel arrays, so a batch costs one query, and idx_releases_org_app narrows each
        // key to the releases of one app. A tag that was built again has several succeeded rows, and the newest wins.
        var dbObjects = await _dbContext
            .Releases.FromSqlRaw(
                SucceededReleasesSql,
                TextArrayParameter("orgs", keys.Select(k => k.Org)),
                TextArrayParameter("apps", keys.Select(k => k.App)),
                TextArrayParameter("tag_names", keys.Select(k => k.TagName)),
                new NpgsqlParameter("succeeded", NpgsqlDbType.Text)
                {
                    Value = BuildResult.Succeeded.ToEnumMemberAttributeValue(),
                }
            )
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        return ReleaseMapper.MapToModels(dbObjects).ToList();
    }

    private static NpgsqlParameter TextArrayParameter(string name, IEnumerable<string> values) =>
        new(name, NpgsqlDbType.Array | NpgsqlDbType.Text) { Value = values.ToArray() };

    public async Task Update(ReleaseEntity releaseEntity)
    {
        long sequenceNo = _dbContext
            .Releases.AsNoTracking()
            .Where(r => r.Org == releaseEntity.Org && r.Buildid == releaseEntity.Build.Id)
            .Select(r => r.Sequenceno)
            .Single();

        var mappedDbObject = ReleaseMapper.MapToDbModel(sequenceNo, releaseEntity);

        _dbContext.Entry(mappedDbObject).State = EntityState.Modified;
        await _dbContext.SaveChangesAsync();
    }
}

using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.Repository.ORMImplementation;
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps.Enums;
using Designer.Tests.DbIntegrationTests.ReleaseEntityRepository.Base;
using Designer.Tests.Fixtures;
using Xunit;

namespace Designer.Tests.DbIntegrationTests.ReleaseEntityRepository;

public class GetSucceededReleasesIntegrationTests : ReleaseEntityIntegrationTestsBase
{
    public GetSucceededReleasesIntegrationTests(DesignerDbFixture dbFixture)
        : base(dbFixture) { }

    [Fact]
    public async Task GetSucceededReleases_ReturnsOnlyRequestedKeysWithSucceededRelease()
    {
        string org = UniqueName("org");
        string app = UniqueName("app");
        string otherApp = UniqueName("app");
        ReleaseEntity found = Release(org, app, "1.0.0", BuildResult.Succeeded);
        await PrepareEntitiesInDatabase([
            found,
            Release(org, app, "2.0.0", BuildResult.Failed),
            // Same tag as a requested key, but in an app that was requested with another tag.
            Release(org, otherApp, "1.0.0", BuildResult.Succeeded),
        ]);
        var repository = new ReleaseRepository(DbFixture.DbContext);

        var result = await repository.GetSucceededReleases(
            [
                new ReleaseLookupKey(org, app, "1.0.0"),
                new ReleaseLookupKey(org, app, "2.0.0"),
                new ReleaseLookupKey(org, app, "3.0.0"),
                new ReleaseLookupKey(org, otherApp, "9.9.9"),
            ],
            CancellationToken.None
        );

        ReleaseEntity actual = Assert.Single(result);
        Assert.Equal(found.Build.Id, actual.Build.Id);
        Assert.Equal(found.TargetCommitish, actual.TargetCommitish);
    }

    [Fact]
    public async Task GetSucceededReleases_SeveralSucceededReleasesWithSameTag_ReturnsNewest()
    {
        string org = UniqueName("org");
        string app = UniqueName("app");
        ReleaseEntity older = Release(org, app, "1.0.0", BuildResult.Succeeded);
        older.Created = DateTime.UtcNow.AddDays(-1);
        ReleaseEntity newer = Release(org, app, "1.0.0", BuildResult.Succeeded);
        await PrepareEntitiesInDatabase([newer, older]);
        var repository = new ReleaseRepository(DbFixture.DbContext);

        var result = await repository.GetSucceededReleases(
            [new ReleaseLookupKey(org, app, "1.0.0"), new ReleaseLookupKey(org, app, "1.0.0")],
            CancellationToken.None
        );

        ReleaseEntity actual = Assert.Single(result);
        Assert.Equal(newer.Build.Id, actual.Build.Id);
    }

    [Fact]
    public async Task GetSucceededReleases_KeysAcrossOrgs_ReturnsOneReleasePerKey()
    {
        var releases = Enumerable
            .Range(0, 5)
            .Select(_ => Release(UniqueName("org"), UniqueName("app"), "1.0.0", BuildResult.Succeeded))
            .ToList();
        await PrepareEntitiesInDatabase(releases);
        var repository = new ReleaseRepository(DbFixture.DbContext);

        var result = await repository.GetSucceededReleases(
            releases.Select(r => new ReleaseLookupKey(r.Org, r.App, r.TagName)).ToList(),
            CancellationToken.None
        );

        Assert.Equal(releases.Select(r => r.Build.Id).Order(), result.Select(r => r.Build.Id).Order());
    }

    [Fact]
    public async Task GetSucceededReleases_NoKeys_ReturnsEmpty()
    {
        var repository = new ReleaseRepository(DbFixture.DbContext);

        var result = await repository.GetSucceededReleases([], CancellationToken.None);

        Assert.Empty(result);
    }

    private static ReleaseEntity Release(string org, string app, string tagName, BuildResult buildResult) =>
        EntityGenerationUtils.Release.GenerateReleaseEntity(
            org,
            app,
            tagname: tagName,
            targetCommitish: Guid.NewGuid().ToString("N"),
            buildResult: buildResult
        );

    private static string UniqueName(string prefix) => $"{prefix}-{Guid.NewGuid():N}";
}

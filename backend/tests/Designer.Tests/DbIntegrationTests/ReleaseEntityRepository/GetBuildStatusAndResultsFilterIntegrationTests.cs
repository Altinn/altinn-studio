using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Repository.ORMImplementation;
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps.Enums;
using Designer.Tests.DbIntegrationTests.ReleaseEntityRepository.Base;
using Designer.Tests.Fixtures;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace Designer.Tests.DbIntegrationTests.ReleaseEntityRepository;

public class GetBuildStatusAndResultsFilterIntegrationTests : ReleaseEntityIntegrationTestsBase
{
    public GetBuildStatusAndResultsFilterIntegrationTests(DesignerDbFixture dbFixture) : base(dbFixture)
    {
    }

    [Theory]
    [MemberData(nameof(TestData))]
    public async Task Get_ShouldReturnCorrectRecordsFromDatabase(string org, string app, List<(BuildStatus status, BuildResult result)> statusReleaseCombinationsInDb, List<string> buildStatuses, List<string> buildResults, int expectedFoundNumber)
    {
        int numberOfEntities = statusReleaseCombinationsInDb.Count;
        string tagName = Guid.NewGuid().ToString();
        var repository = new ORMReleaseRepository(DbFixture.DbContext);
        var releaseEntities = EntityGenerationUtils.GenerateReleaseEntities(org, app, numberOfEntities).ToList();
        for (int i = 0; i < numberOfEntities; i++)
        {
            releaseEntities[i].TagName = tagName;
            releaseEntities[i].Build.Status = statusReleaseCombinationsInDb[i].status;
            releaseEntities[i].Build.Result = statusReleaseCombinationsInDb[i].result;
        }

        await PrepareEntitiesInDatabase(releaseEntities);

        var expectedEntites = releaseEntities.Where(r =>
            r.Org == org && r.App == app && r.TagName == tagName)
            .Where(r =>
            (buildStatuses is not null && buildStatuses.Contains(r.Build.Status.ToEnumMemberAttributeValue())) ||
            (buildResults is not null && buildResults.Contains(r.Build.Result.ToEnumMemberAttributeValue()))).ToList();


        var allRecords = DbFixture.DbContext.Releases.AsNoTracking()
            .Where(d => d.Org == org && d.App == app && d.Tagname == tagName).ToList();


        var results = (await repository.Get(org, app, tagName, buildStatuses, buildResults)).ToList();

        results.Should().HaveCount(expectedFoundNumber);
        results.Should().BeEquivalentTo(expectedEntites);
    }

    public static IEnumerable<object[]> TestData()
    {
        yield return [
            "ttd",
            Guid.NewGuid().ToString(),
            new List<(BuildStatus status, BuildResult result)>
            {
                (BuildStatus.Completed, BuildResult.Succeeded),
                (BuildStatus.Completed, BuildResult.Failed),
                (BuildStatus.InProgress, BuildResult.Succeeded),
                (BuildStatus.NotStarted, BuildResult.Canceled)
            },
            new List<string> { "completed", "inProgress" },
            null,
            3
        ];
        yield return [
            "ttd",
            Guid.NewGuid().ToString(),
            new List<(BuildStatus status, BuildResult result)>
            {
                (BuildStatus.Completed, BuildResult.Succeeded),
                (BuildStatus.Completed, BuildResult.Failed),
                (BuildStatus.InProgress, BuildResult.Succeeded),
                (BuildStatus.NotStarted, BuildResult.Canceled)
            },
            null,
            null,
            0
        ];
        yield return [
            "ttd",
            Guid.NewGuid().ToString(),
            new List<(BuildStatus status, BuildResult result)>
            {
                (BuildStatus.Completed, BuildResult.Succeeded),
                (BuildStatus.Completed, BuildResult.Failed),
                (BuildStatus.InProgress, BuildResult.Succeeded),
                (BuildStatus.NotStarted, BuildResult.Canceled)
            },
            null,
            new List<string> { "succeeded"},
            2
        ];
        yield return [
            "ttd",
            Guid.NewGuid().ToString(),
            new List<(BuildStatus status, BuildResult result)>
            {
                (BuildStatus.Completed, BuildResult.Succeeded),
                (BuildStatus.Completed, BuildResult.Failed),
                (BuildStatus.InProgress, BuildResult.Succeeded),
                (BuildStatus.NotStarted, BuildResult.Canceled)
            },
            new List<string> { "completed"},
            new List<string> { "succeeded"},
            3
        ];
        yield return [
            "ttd",
            Guid.NewGuid().ToString(),
            new List<(BuildStatus status, BuildResult result)>
            {
                (BuildStatus.Completed, BuildResult.Succeeded),
                (BuildStatus.Completed, BuildResult.Failed),
                (BuildStatus.InProgress, BuildResult.Succeeded),
                (BuildStatus.NotStarted, BuildResult.Canceled)
            },
            new List<string> { "cancelling"},
            new List<string> { "partiallySucceeded"},
            0
        ];

    }


}

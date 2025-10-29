#nullable disable
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Altinn.AccessManagement.Tests.Utils;
using Altinn.Studio.Designer.Repository.ORMImplementation;
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps.Enums;
using Designer.Tests.DbIntegrationTests.ReleaseEntityRepository.Base;
using Designer.Tests.Fixtures;
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
        var repository = new ReleaseRepository(DbFixture.DbContext);
        var releaseEntities = EntityGenerationUtils.Release.GenerateReleaseEntities(org, app, numberOfEntities).ToList();
        for (int i = 0; i < numberOfEntities; i++)
        {
            releaseEntities[i].TagName = tagName;
            releaseEntities[i].Build.Status = statusReleaseCombinationsInDb[i].status;
            releaseEntities[i].Build.Result = statusReleaseCombinationsInDb[i].result;
        }

        await PrepareEntitiesInDatabase(releaseEntities);

        var exptectedEntities = releaseEntities.Where(r =>
            r.Org == org && r.App == app && r.TagName == tagName)
            .Where(r =>
            (buildStatuses is not null && buildStatuses.Contains(r.Build.Status.ToEnumMemberAttributeValue())) ||
            (buildResults is not null && buildResults.Contains(r.Build.Result.ToEnumMemberAttributeValue()))).ToList();

        var results = (await repository.Get(org, app, tagName, buildStatuses, buildResults)).ToList();

        Assert.Equal(expectedFoundNumber, results.Count);
        AssertionUtil.AssertEqualTo(exptectedEntities, results);
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
                (BuildStatus.InProgress, BuildResult.Canceled),
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
                (BuildStatus.InProgress, BuildResult.Canceled),
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
                (BuildStatus.InProgress, BuildResult.Canceled),
                (BuildStatus.NotStarted, BuildResult.Canceled)
            },
            null,
            new List<string> { "succeeded" },
            1
        ];
        yield return [
            "ttd",
            Guid.NewGuid().ToString(),
            new List<(BuildStatus status, BuildResult result)>
            {
                (BuildStatus.Completed, BuildResult.Succeeded),
                (BuildStatus.InProgress, BuildResult.Failed),
                (BuildStatus.InProgress, BuildResult.Canceled),
                (BuildStatus.NotStarted, BuildResult.Canceled)
            },
            new List<string> { "completed" },
            new List<string> { "canceled", "succeeded" },
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
            new List<string> { "cancelling" },
            new List<string> { "partiallySucceeded" },
            0
        ];
    }
}

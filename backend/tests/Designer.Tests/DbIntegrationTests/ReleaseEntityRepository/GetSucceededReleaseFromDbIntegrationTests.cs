using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Repository.ORMImplementation;
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps.Enums;
using Designer.Tests.DbIntegrationTests.ReleaseEntityRepository.Base;
using Designer.Tests.Fixtures;
using FluentAssertions;
using Xunit;

namespace Designer.Tests.DbIntegrationTests.ReleaseEntityRepository;

public class GetSucceededReleaseFromDbIntegrationTests : ReleaseEntityIntegrationTestsBase
{
    public GetSucceededReleaseFromDbIntegrationTests(DesignerDbFixture dbFixture) : base(dbFixture)
    {
    }

    [Theory]
    [MemberData(nameof(TestData))]
    public async Task Get_ShouldReturnCorrectRecordsFromDatabase(string org, string app, List<(BuildStatus status, BuildResult result)> statusReleaseCombinationsInDb)
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

        var exptectedEntity = releaseEntities.Single(r =>
            r.Org == org &&
            r.App == app &&
            r.TagName == tagName &&
            r.Build.Result == BuildResult.Succeeded);

        var result = await repository.GetSucceededReleaseFromDb(org, app, tagName);
        result.Should().BeEquivalentTo(exptectedEntity);
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
            }
        ];
    }
}

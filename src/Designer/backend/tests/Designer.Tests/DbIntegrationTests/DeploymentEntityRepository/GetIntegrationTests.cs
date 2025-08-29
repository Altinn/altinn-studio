using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Repository.ORMImplementation;
using Altinn.Studio.Designer.ViewModels.Request;
using Altinn.Studio.Designer.ViewModels.Request.Enums;
using Designer.Tests.Fixtures;
using Xunit;

namespace Designer.Tests.DbIntegrationTests.DeploymentEntityRepository;

public class GetIntegrationTests : DbIntegrationTestsBase
{
    public GetIntegrationTests(DesignerDbFixture dbFixture) : base(dbFixture)
    {
    }

    [Theory]
    [MemberData(nameof(TopAndSortTestData))]
    public async Task Get_ShouldReturnCorrectRecordsFromDatabase(string org, string app, int top, SortDirection sortDirection)
    {
        int allEntitiesCount = 10;
        var deploymentEntities = EntityGenerationUtils.Deployment.GenerateDeploymentEntities(org, app, allEntitiesCount).ToList();
        await DbFixture.PrepareEntitiesInDatabase(deploymentEntities);

        var repository = new DeploymentRepository(DbFixture.DbContext);
        var query = new DocumentQueryModel { Top = top, SortDirection = sortDirection };
        var result = (await repository.Get(org, app, query)).ToList();

        var expectedEntities = (sortDirection == SortDirection.Ascending
                ? deploymentEntities.OrderBy(d => d.Created)
                : deploymentEntities.OrderByDescending(d => d.Created))
            .Take(top)
            .ToList();

        Assert.Equal(top, result.Count);
        Assert.Equal(top, result.Count);


        expectedEntities.ToHashSet().SetEquals(result.ToHashSet());
        var compareList = expectedEntities.Zip(result, (expected, actual) =>
        {
            EntityAssertions.AssertEqual(expected, actual, TimeSpan.FromMilliseconds(200));
            return true;
        }).ToList();

        Assert.All(compareList, Assert.True);
    }

    [Theory]
    [MemberData(nameof(SortTestData))]
    public async Task Get_Without_TopDefined_ShouldReturnAllRecordsForGivenApp(string org, string app,
        SortDirection sortDirection)
    {
        int allEntitiesCount = 10;
        var deploymentEntities = EntityGenerationUtils.Deployment.GenerateDeploymentEntities(org, app, allEntitiesCount).ToList();
        await DbFixture.PrepareEntitiesInDatabase(deploymentEntities);

        var repository = new DeploymentRepository(DbFixture.DbContext);
        var query = new DocumentQueryModel
        {
            Top = null,
            SortDirection = sortDirection
        };
        var result = (await repository.Get(org, app, query)).ToList();

        var expectedEntities = (sortDirection == SortDirection.Ascending
                ? deploymentEntities.OrderBy(d => d.Created)
                : deploymentEntities.OrderByDescending(d => d.Created))
            .ToList();

        Assert.Equal(allEntitiesCount, result.Count);

        var compareList = expectedEntities.Zip(result, (expected, actual) =>
        {
            EntityAssertions.AssertEqual(expected, actual, TimeSpan.FromMilliseconds(200));
            return true;
        }).ToList();

        Assert.All(compareList, Assert.True);

    }

    public static IEnumerable<object[]> TopAndSortTestData()
    {
        yield return ["ttd", Guid.NewGuid().ToString(), 3, SortDirection.Ascending];
        yield return ["ttd", Guid.NewGuid().ToString(), 3, SortDirection.Descending];
    }

    public static IEnumerable<object[]> SortTestData()
    {
        yield return ["ttd", Guid.NewGuid().ToString(), SortDirection.Ascending];
        yield return ["ttd", Guid.NewGuid().ToString(), SortDirection.Descending];
    }
}

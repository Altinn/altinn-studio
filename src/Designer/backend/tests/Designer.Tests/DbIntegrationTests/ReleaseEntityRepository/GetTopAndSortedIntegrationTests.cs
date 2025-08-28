using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Altinn.AccessManagement.Tests.Utils;
using Altinn.Studio.Designer.Repository.ORMImplementation;
using Altinn.Studio.Designer.ViewModels.Request;
using Altinn.Studio.Designer.ViewModels.Request.Enums;
using Designer.Tests.DbIntegrationTests.ReleaseEntityRepository.Base;
using Designer.Tests.Fixtures;
using Xunit;

namespace Designer.Tests.DbIntegrationTests.ReleaseEntityRepository;

public class GetTopAndSortedIntegrationTests : ReleaseEntityIntegrationTestsBase
{
    public GetTopAndSortedIntegrationTests(DesignerDbFixture dbFixture) : base(dbFixture)
    {
    }

    [Theory]
    [MemberData(nameof(TopAndSortTestData))]
    public async Task Get_ShouldReturnCorrectRecordsFromDatabase(string org, string app, int top, SortDirection sortDirection)
    {
        int allEntitiesCount = 10;
        var releaseEntities = EntityGenerationUtils.Release.GenerateReleaseEntities(org, app, allEntitiesCount).ToList();
        await PrepareEntitiesInDatabase(releaseEntities);

        var repository = new ReleaseRepository(DbFixture.DbContext);
        var query = new DocumentQueryModel { Top = top, SortDirection = sortDirection };
        var result = (await repository.Get(org, app, query)).ToList();

        var expectedEntities = (sortDirection == SortDirection.Ascending
                ? releaseEntities.OrderBy(d => d.Created)
                : releaseEntities.OrderByDescending(d => d.Created))
            .Take(top)
            .ToList();

        Assert.Equal(top, result.Count);
        AssertionUtil.AssertEqualTo(expectedEntities, result);
    }

    [Theory]
    [MemberData(nameof(SortTestData))]
    public async Task Get_Without_TopDefined_ShouldReturnAllRecordsForGivenApp(string org, string app,
        SortDirection sortDirection)
    {
        int allEntitiesCount = 10;
        var releaseEntities = EntityGenerationUtils.Release.GenerateReleaseEntities(org, app, allEntitiesCount).ToList();
        await PrepareEntitiesInDatabase(releaseEntities);

        var repository = new ReleaseRepository(DbFixture.DbContext);
        var query = new DocumentQueryModel
        {
            Top = null,
            SortDirection = sortDirection
        };
        var result = (await repository.Get(org, app, query)).ToList();

        var expectedEntities = (sortDirection == SortDirection.Ascending
                ? releaseEntities.OrderBy(r => r.Created)
                : releaseEntities.OrderByDescending(r => r.Created))
            .ToList();

        Assert.Equal(allEntitiesCount, result.Count);
        AssertionUtil.AssertEqualTo(expectedEntities, result);

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

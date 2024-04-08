using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.Repository.ORMImplementation;
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps.Enums;
using Altinn.Studio.Designer.ViewModels.Request;
using Altinn.Studio.Designer.ViewModels.Request.Enums;
using Designer.Tests.Fixtures;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace Designer.Tests.DbIntegrationTests.DeploymentEntityRepository;

public class GetIntegrationTests : DbIntegrationTestsBase
{
    private JsonSerializerOptions _jsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false,
        Converters = { new JsonStringEnumConverter() }
    };

    public GetIntegrationTests(DesignerDbFixture dbFixture) : base(dbFixture)
    {
    }

    [Theory]
    [MemberData(nameof(TopAndSortTestData))]
    public async Task Get_ShouldReturnCorrectRecordsFromDatabase(string org, string app, int top, SortDirection sortDirection)
    {
        int allEntitiesCount = 10;
        var deploymentEntities = DeploymentEntityGenerator.GenerateDeploymentEntities(org, app, allEntitiesCount).ToList();
        await PrepareEntitiesInDatabase(deploymentEntities);

        var repository = new ORMDeploymentRepository(DbFixture.DbContext);
        var query = new DocumentQueryModel() { Top = top, SortDirection = sortDirection };
        var result = await repository.Get(org, app, query);

        var expectedEntities = (sortDirection == SortDirection.Ascending
                ? deploymentEntities.OrderBy(d => d.Created)
                : deploymentEntities.OrderByDescending(d => d.Created))
            .Take(top)
            .ToList();

        result.Count().Should().Be(top);
        result.Should().BeEquivalentTo(expectedEntities);
    }

    [Theory]
    [MemberData(nameof(SortTestData))]
    public async Task Get_Without_TopDefined_ShouldReturnAllRecordsForGivenApp(string org, string app,
        SortDirection sortDirection)
    {
        int allEntitiesCount = 10;
        var deploymentEntities = DeploymentEntityGenerator.GenerateDeploymentEntities(org, app, allEntitiesCount).ToList();
        await PrepareEntitiesInDatabase(deploymentEntities);

        var repository = new ORMDeploymentRepository(DbFixture.DbContext);
        var query = new DocumentQueryModel()
        {
            Top = null,
            SortDirection = sortDirection
        };
        var result = await repository.Get(org, app, query);

        var expectedEntities = (sortDirection == SortDirection.Ascending
                ? deploymentEntities.OrderBy(d => d.Created)
                : deploymentEntities.OrderByDescending(d => d.Created))
            .ToList();

        result.Count().Should().Be(allEntitiesCount);
        result.Should().BeEquivalentTo(expectedEntities);

    }

    private async Task PrepareEntitiesInDatabase(IEnumerable<DeploymentEntity> deploymentEntities)
    {
        var dbObjects = deploymentEntities.Select(
            deploymentEntity => new Altinn.Studio.Designer.Repository.ORMImplementation.Models.Deployment
            {
                Buildid = deploymentEntity.Build.Id,
                Tagname = deploymentEntity.TagName,
                Org = deploymentEntity.Org,
                App = deploymentEntity.App,
                Buildresult = deploymentEntity.Build.Result.ToEnumMemberAttributeValue(),
                Created = deploymentEntity.Created,
                Entity = JsonSerializer.Serialize(deploymentEntity, _jsonOptions)
            });

        await DbFixture.DbContext.Deployments.AddRangeAsync(dbObjects);
        await DbFixture.DbContext.SaveChangesAsync();
        foreach (var dbObject in dbObjects)
        {
            DbFixture.DbContext.Entry(dbObject).State = EntityState.Detached;
        }
    }

    public static IEnumerable<object[]> TopAndSortTestData()
    {
        yield return new object[] { "ttd", Guid.NewGuid().ToString(), 3, SortDirection.Ascending };
        yield return new object[] { "ttd", Guid.NewGuid().ToString(), 3, SortDirection.Descending };
    }

    public static IEnumerable<object[]> SortTestData()
    {
        yield return new object[] { "ttd", Guid.NewGuid().ToString(), SortDirection.Ascending };
        yield return new object[] { "ttd", Guid.NewGuid().ToString(), SortDirection.Descending };
    }
}

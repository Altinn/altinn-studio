using System;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.Repository.ORMImplementation;
using Designer.Tests.Fixtures;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace Designer.Tests.DbIntegrationTests.DeploymentEntityRepository;

public class CreateIntegrationTests : DbIntegrationTestsBase
{
    private JsonSerializerOptions _jsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false,
        Converters = { new JsonStringEnumConverter() }
    };

    public CreateIntegrationTests(PostgreSqlFixture dbFixture) : base(dbFixture)
    {
    }

    [Theory]
    [InlineData("ttd")]
    public async Task Create_ShouldInsertRecordInDatabase(string org)
    {
        var repository = new ORMDeploymentRepository(DbContext);
        var buildId = Guid.NewGuid();
        var deploymentEntity = DeploymentEntityGenerator.GenerateDeploymentEntity(org, buildId: buildId.ToString());
        await repository.Create(deploymentEntity);
        var dbRecord = await DbContext.Deployments.AsNoTracking().FirstOrDefaultAsync(d =>
            d.Org == org &&
            d.App == deploymentEntity.App &&
            d.Buildid == buildId.ToString());
        dbRecord.App.Should().BeEquivalentTo(deploymentEntity.App);
        dbRecord.Org.Should().BeEquivalentTo(org);
        dbRecord.Buildid.Should().BeEquivalentTo(buildId.ToString());
        dbRecord.Buildresult.Should().BeEquivalentTo(deploymentEntity.Build.Result.ToString());
        dbRecord.Tagname.Should().BeEquivalentTo(deploymentEntity.TagName);
        var entityFromColumn = JsonSerializer.Deserialize<DeploymentEntity>(dbRecord.Entity, _jsonOptions);
        entityFromColumn.Should().BeEquivalentTo(deploymentEntity);
    }

}

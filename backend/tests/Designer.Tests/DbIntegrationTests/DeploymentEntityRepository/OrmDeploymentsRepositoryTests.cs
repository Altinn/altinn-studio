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

public class OrmDeploymentsRepositoryTests : DbIntegrationTestsBase
{
    private JsonSerializerOptions _jsonOptions = new JsonSerializerOptions
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false,
        Converters = { new JsonStringEnumConverter() }
    };

    public OrmDeploymentsRepositoryTests(PostgreSqlFixture dbFixture) : base(dbFixture)
    {
    }

    [Theory]
    [InlineData("ttd")]
    public async Task OrmDeploymentsRepo_CreateDeployment(string org)
    {
        var repository = new ORMDeploymentRepository(DbContext);
        var buildId = Guid.NewGuid();
        string app = Guid.NewGuid().ToString();
        var deploymentEntity = DeploymentEntityGenerator.GenerateDeploymentEntity(org, app, buildId.ToString());
        await repository.Create(deploymentEntity);
        var dbRecord = await DbContext.Deployments.AsNoTracking().FirstOrDefaultAsync(d =>
            d.Org == org &&
            d.App == app &&
            d.Buildid == buildId.ToString());
        dbRecord.App.Should().BeEquivalentTo(app);
        dbRecord.Org.Should().BeEquivalentTo(org);
        dbRecord.Buildid.Should().BeEquivalentTo(buildId.ToString());
        dbRecord.Buildresult.Should().BeEquivalentTo(deploymentEntity.Build.Result.ToString());
        dbRecord.Tagname.Should().BeEquivalentTo(deploymentEntity.TagName);
        var entityFromColumn = JsonSerializer.Deserialize<DeploymentEntity>(dbRecord.Entity, _jsonOptions);
        entityFromColumn.Should().BeEquivalentTo(deploymentEntity);
    }

}

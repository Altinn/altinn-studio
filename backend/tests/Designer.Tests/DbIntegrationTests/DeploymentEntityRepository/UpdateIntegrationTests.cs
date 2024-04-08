using System;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.Repository.ORMImplementation;
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps.Enums;
using Designer.Tests.Fixtures;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace Designer.Tests.DbIntegrationTests.DeploymentEntityRepository;

public class UpdateIntegrationTests : DbIntegrationTestsBase
{
    private JsonSerializerOptions _jsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false,
        Converters = { new JsonStringEnumConverter() }
    };

    public UpdateIntegrationTests(DesignerDbFixture dbFixture) : base(dbFixture)
    {
    }

    [Theory]
    [InlineData("ttd")]
    public async Task Update_ShouldUpdateRecordInDatabase(string org)
    {
        var repository = new ORMDeploymentRepository(DbFixture.DbContext);
        var buildId = Guid.NewGuid();
        var deploymentEntity = DeploymentEntityGenerator.GenerateDeploymentEntity(
            org,
            buildId: buildId.ToString(),
            buildStatus: BuildStatus.InProgress,
            buildResult: BuildResult.None);
        await repository.Create(deploymentEntity);

        deploymentEntity.Build.Status = BuildStatus.Completed;
        deploymentEntity.Build.Result = BuildResult.Failed;
        deploymentEntity.Build.Finished = DateTime.Now;

        DbFixture.DbContext.ChangeTracker.Clear();

        await repository.Update(deploymentEntity);

        var dbRecord = await DbFixture.DbContext.Deployments.AsNoTracking().FirstOrDefaultAsync(d =>
            d.Org == org &&
            d.App == deploymentEntity.App &&
            d.Buildid == buildId.ToString());

        dbRecord.Buildresult.Should().BeEquivalentTo(deploymentEntity.Build.Result.ToString());
        var entityFromColumn = JsonSerializer.Deserialize<DeploymentEntity>(dbRecord.Entity, _jsonOptions);
        entityFromColumn.Should().BeEquivalentTo(deploymentEntity);



    }
}

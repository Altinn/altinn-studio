using System;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Repository.ORMImplementation;
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps.Enums;
using Designer.Tests.Fixtures;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace Designer.Tests.DbIntegrationTests.DeploymentEntityRepository;

public class UpdateIntegrationTests : DbIntegrationTestsBase
{
    public UpdateIntegrationTests(DesignerDbFixture dbFixture) : base(dbFixture)
    {
    }

    [Theory]
    [InlineData("ttd")]
    public async Task Update_ShouldUpdateRecordInDatabase(string org)
    {
        var repository = new DeploymentRepository(DbFixture.DbContext);
        var buildId = Guid.NewGuid();
        var deploymentEntity = EntityGenerationUtils.Deployment.GenerateDeploymentEntity(
            org,
            buildId: buildId.ToString(),
            buildStatus: BuildStatus.InProgress,
            buildResult: BuildResult.None);

        await DbFixture.PrepareEntityInDatabase(deploymentEntity);

        deploymentEntity.Build.Status = BuildStatus.Completed;
        deploymentEntity.Build.Result = BuildResult.Failed;
        deploymentEntity.Build.Finished = DateTime.UtcNow;

        await repository.Update(deploymentEntity);

        var dbRecord = await DbFixture.DbContext.Deployments.Include(d => d.Build).AsNoTracking().FirstOrDefaultAsync(d =>
            d.Org == org &&
            d.App == deploymentEntity.App &&
            d.Buildid == buildId.ToString());

        EntityAssertions.AssertEqual(deploymentEntity, dbRecord);
    }
}

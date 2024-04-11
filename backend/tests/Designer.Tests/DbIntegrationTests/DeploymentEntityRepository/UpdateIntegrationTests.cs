using System;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Repository.ORMImplementation;
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps.Enums;
using Designer.Tests.DbIntegrationTests.DeploymentEntityRepository.Base;
using Designer.Tests.Fixtures;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace Designer.Tests.DbIntegrationTests.DeploymentEntityRepository;

public class UpdateIntegrationTests : DeploymentEntityIntegrationTestsBase
{
    public UpdateIntegrationTests(DesignerDbFixture dbFixture) : base(dbFixture)
    {
    }

    [Theory]
    [InlineData("ttd")]
    public async Task Update_ShouldUpdateRecordInDatabase(string org)
    {
        var repository = new ORMDeploymentRepository(DbFixture.DbContext);
        var buildId = Guid.NewGuid();
        var deploymentEntity = EntityGenerationUtils.GenerateDeploymentEntity(
            org,
            buildId: buildId.ToString(),
            buildStatus: BuildStatus.InProgress,
            buildResult: BuildResult.None);

        await PrepareEntityInDatabase(deploymentEntity);

        deploymentEntity.Build.Status = BuildStatus.Completed;
        deploymentEntity.Build.Result = BuildResult.Failed;
        deploymentEntity.Build.Finished = DateTime.UtcNow;

        await repository.Update(deploymentEntity);

        var dbRecord = await DbFixture.DbContext.Deployments.AsNoTracking().FirstOrDefaultAsync(d =>
            d.Org == org &&
            d.App == deploymentEntity.App &&
            d.Buildid == buildId.ToString());

        EntityAssertions.AssertEqual(deploymentEntity, dbRecord);
    }
}

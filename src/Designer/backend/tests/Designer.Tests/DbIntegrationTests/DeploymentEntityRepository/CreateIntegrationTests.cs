using System;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Repository.ORMImplementation;
using Altinn.Studio.Designer.Repository.ORMImplementation.Models;
using Designer.Tests.Fixtures;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace Designer.Tests.DbIntegrationTests.DeploymentEntityRepository;

public class CreateIntegrationTests : DbIntegrationTestsBase
{
    public CreateIntegrationTests(DesignerDbFixture dbFixture)
        : base(dbFixture) { }

    [Theory]
    [InlineData("ttd", null)]
    [InlineData("ttd", AppStatus.Completed)]
    public async Task Create_ShouldInsertRecordInDatabase(string org, AppStatus? appStatus)
    {
        var repository = new DeploymentRepository(DbFixture.DbContext);
        var buildId = Guid.NewGuid();
        var deploymentEntity = EntityGenerationUtils.Deployment.GenerateDeploymentEntity(
            org,
            buildId: buildId.ToString(),
            appStatus: appStatus
        );
        await repository.Create(deploymentEntity);
        var dbRecord = await DbFixture
            .DbContext.Deployments.Include(d => d.Build)
            .AsNoTracking()
            .FirstOrDefaultAsync(d => d.Org == org && d.App == deploymentEntity.App && d.Buildid == buildId.ToString());

        Assert.Equal(DeploymentType.Deploy, dbRecord.DeploymentType);

        EntityAssertions.AssertEqual(deploymentEntity, dbRecord);
    }
}

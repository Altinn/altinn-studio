using System;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Repository.ORMImplementation;
using Designer.Tests.DbIntegrationTests.DeploymentEntityRepository.Base;
using Designer.Tests.Fixtures;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace Designer.Tests.DbIntegrationTests.DeploymentEntityRepository;

public class CreateIntegrationTests : DeploymentEntityIntegrationTestsBase
{
    public CreateIntegrationTests(DesignerDbFixture dbFixture) : base(dbFixture)
    {
    }

    [Theory]
    [InlineData("ttd")]
    public async Task Create_ShouldInsertRecordInDatabase(string org)
    {
        var repository = new ORMDeploymentRepository(DbFixture.DbContext);
        var buildId = Guid.NewGuid();
        var deploymentEntity = EntityGenerationUtils.GenerateDeploymentEntity(org, buildId: buildId.ToString());
        await repository.Create(deploymentEntity);
        var dbRecord = await DbFixture.DbContext.Deployments.AsNoTracking().FirstOrDefaultAsync(d =>
            d.Org == org &&
            d.App == deploymentEntity.App &&
            d.Buildid == buildId.ToString());

        EntityAssertions.AssertEqual(deploymentEntity, dbRecord);
    }

}

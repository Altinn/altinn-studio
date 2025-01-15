using System;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Repository.ORMImplementation;
using Designer.Tests.DbIntegrationTests.DeploymentEntityRepository.Base;
using Designer.Tests.Fixtures;
using Xunit;

namespace Designer.Tests.DbIntegrationTests.DeploymentEntityRepository;

public class GetSingleIntegrationTests : DeploymentEntityIntegrationTestsBase
{
    public GetSingleIntegrationTests(DesignerDbFixture dbFixture) : base(dbFixture)
    {
    }

    [Theory]
    [InlineData("ttd")]
    public async Task Get_ShouldReturnRecordFromDatabase(string org)
    {
        var deploymentEntity = EntityGenerationUtils.Deployment.GenerateDeploymentEntity(org);
        await PrepareEntityInDatabase(deploymentEntity);

        var repository = new DeploymentRepository(DbFixture.DbContext);
        var result = await repository.Get(deploymentEntity.Org, deploymentEntity.Build.Id);

        result.Should().BeEquivalentTo(deploymentEntity, options =>
            options.Using<DateTime>(ctx =>
                ctx.Subject.Should().BeCloseTo(ctx.Expectation, TimeSpan.FromMilliseconds(200))
            ).WhenTypeIs<DateTime>());
    }
}

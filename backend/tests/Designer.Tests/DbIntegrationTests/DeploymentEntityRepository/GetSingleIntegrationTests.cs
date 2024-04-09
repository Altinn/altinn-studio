using System.Threading.Tasks;
using Altinn.Studio.Designer.Repository.ORMImplementation;
using Designer.Tests.DbIntegrationTests.DeploymentEntityRepository.Base;
using Designer.Tests.Fixtures;
using FluentAssertions;
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
        var deploymentEntity = EntityGenerationUtils.GenerateDeploymentEntity(org);
        await PrepareEntityInDatabase(deploymentEntity);

        var repository = new ORMDeploymentRepository(DbFixture.DbContext);
        var result = await repository.Get(deploymentEntity.Org, deploymentEntity.Build.Id);
        result.Should().BeEquivalentTo(deploymentEntity);
    }
}

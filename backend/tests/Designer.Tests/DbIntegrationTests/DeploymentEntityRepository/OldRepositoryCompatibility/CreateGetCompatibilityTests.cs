using System;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Repository;
using Altinn.Studio.Designer.Repository.ORMImplementation;
using Designer.Tests.Fixtures;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace Designer.Tests.DbIntegrationTests.DeploymentEntityRepository.OldRepositoryCompatibility;

public class CreateGetCompatibilityTests : DbIntegrationTestsBase
{
    public CreateGetCompatibilityTests(DesignerDbFixture dbFixture) : base(dbFixture)
    {
    }


    [Theory]
    [InlineData("ttd")]
    public async Task CreateOld_ShouldBeCompatibleWithNewGet(string org)
    {
        var oldRepository = CreateOldRepository();
        string buildId = Guid.NewGuid().ToString();
        var deploymentEntity = DeploymentEntityGenerator.GenerateDeploymentEntity(org, buildId: buildId);
        await oldRepository.Create(deploymentEntity);
        var newRepository = new ORMDeploymentRepository(DbFixture.DbContext);
        var queriedEntity = await newRepository.Get(org, buildId);
        queriedEntity.Should().BeEquivalentTo(deploymentEntity);
    }

    [Theory]
    [InlineData("ttd")]
    public async Task CreateNew_ShouldBeCompatibleWithOldGet(string org)
    {
        var newRepository = new ORMDeploymentRepository(DbFixture.DbContext);
        string buildId = Guid.NewGuid().ToString();
        var deploymentEntity = DeploymentEntityGenerator.GenerateDeploymentEntity(org, buildId: buildId);
        await newRepository.Create(deploymentEntity);
        var oldRepository = CreateOldRepository();
        var queriedEntity = await oldRepository.Get(org, buildId);
        queriedEntity.Should().BeEquivalentTo(deploymentEntity);
    }

    private DeploymentRepository CreateOldRepository()
    {
        var options = new PostgreSQLSettings
        {
            ConnectionString = DbFixture.ConnectionString
        };
        return new DeploymentRepository(options, new Mock<ILogger<DeploymentRepository>>().Object);
    }
}

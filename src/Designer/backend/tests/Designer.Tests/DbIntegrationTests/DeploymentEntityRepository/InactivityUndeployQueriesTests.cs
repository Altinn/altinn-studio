using System;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.Repository.ORMImplementation;
using Designer.Tests.Fixtures;
using Xunit;

namespace Designer.Tests.DbIntegrationTests.DeploymentEntityRepository;

public class InactivityUndeployQueriesTests : DbIntegrationTestsBase
{
    public InactivityUndeployQueriesTests(DesignerDbFixture dbFixture)
        : base(dbFixture) { }

    [Fact]
    public async Task GetLatestDeployTimes_ShouldReturnLatestDeploySinceCutoffPerApp()
    {
        var org = Guid.NewGuid().ToString("N");
        var now = DateTime.UtcNow;
        await Prepare(org, "app1", "at23", DeploymentType.Deploy, now.AddDays(-10));
        await Prepare(org, "app1", "at23", DeploymentType.Deploy, now.AddDays(-2));
        await Prepare(org, "app2", "at23", DeploymentType.Deploy, now.AddDays(-40));
        await Prepare(org, "app3", "at23", DeploymentType.Decommission, now.AddDays(-1));
        await Prepare(org, "app4", "tt02", DeploymentType.Deploy, now.AddDays(-1));

        var repository = new DeploymentRepository(DbFixture.DbContext);
        var result = await repository.GetLatestDeployTimes(org, "at23", now.AddDays(-30));

        var latest = Assert.Single(result);
        Assert.Equal("app1", latest.Key);
        Assert.Equal(now.AddDays(-2), latest.Value.UtcDateTime, TimeSpan.FromMilliseconds(1));
    }

    [Fact]
    public async Task CountDecommissionsCreatedBySince_ShouldCountRecentDecommissionsOfTheDeveloperAcrossOrgs()
    {
        var systemDeveloper = Guid.NewGuid().ToString("N");
        var now = DateTime.UtcNow;
        await Prepare("ttd", "app1", "at23", DeploymentType.Decommission, now.AddHours(-1), systemDeveloper);
        await Prepare("skd", "app2", "tt02", DeploymentType.Decommission, now.AddHours(-23), systemDeveloper);
        await Prepare("ttd", "app3", "at23", DeploymentType.Decommission, now.AddHours(-25), systemDeveloper);
        await Prepare("ttd", "app4", "at23", DeploymentType.Deploy, now.AddHours(-1), systemDeveloper);
        await Prepare("ttd", "app5", "at23", DeploymentType.Decommission, now.AddHours(-1));

        var repository = new DeploymentRepository(DbFixture.DbContext);
        var count = await repository.CountDecommissionsCreatedBySince(systemDeveloper, now.AddDays(-1));

        Assert.Equal(2, count);
    }

    private async Task Prepare(
        string org,
        string app,
        string environment,
        DeploymentType deploymentType,
        DateTime created,
        string createdBy = "testUser"
    )
    {
        var deployment = EntityGenerationUtils.Deployment.GenerateDeploymentEntity(
            org,
            app,
            envName: environment,
            deploymentType: deploymentType
        );
        deployment.Created = created;
        deployment.CreatedBy = createdBy;
        await DbFixture.PrepareEntityInDatabase(deployment);
    }
}

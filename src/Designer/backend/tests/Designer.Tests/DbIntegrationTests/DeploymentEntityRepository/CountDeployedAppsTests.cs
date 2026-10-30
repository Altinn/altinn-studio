using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.Repository.ORMImplementation;
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps.Enums;
using Designer.Tests.Fixtures;
using Xunit;

namespace Designer.Tests.DbIntegrationTests.DeploymentEntityRepository;

public class CountDeployedAppsTests : DbIntegrationTestsBase
{
    private readonly string _org = $"org-{Guid.NewGuid():N}"[..20];

    public CountDeployedAppsTests(DesignerDbFixture dbFixture)
        : base(dbFixture) { }

    [Fact]
    public async Task CountDeployedApps_CountsAppsWhoseLatestSuccessIsADeploy()
    {
        await Deploy("deployed", "tt02");
        await Deploy("decommissioned", "tt02");
        await Deploy("decommissioned", "tt02", DeploymentType.Decommission);
        await Deploy("redeploy-failed", "tt02");
        await Deploy("redeploy-failed", "tt02", buildResult: BuildResult.Failed);
        await Deploy("install-failed", "tt02", finalEvent: DeployEventType.InstallFailed);
        await Deploy("uninstall-failed", "tt02");
        await Deploy("uninstall-failed", "tt02", DeploymentType.Decommission, DeployEventType.UninstallFailed);
        await Deploy("in-production", "tt02");
        await Deploy("in-production", "production", finalEvent: DeployEventType.InstallSucceeded);
        await Deploy("gone", "at22");
        await Deploy("gone", "at22", DeploymentType.Decommission, DeployEventType.UninstallSucceeded);

        IReadOnlyList<DeployedAppCount> counts = await new DeploymentRepository(DbFixture.DbContext).CountDeployedApps(
            CancellationToken.None
        );

        Assert.Equal(
            new Dictionary<string, int>
            {
                ["tt02"] = 4,
                ["production"] = 1,
                ["at22"] = 0,
            },
            counts.Where(count => count.Org == _org).ToDictionary(count => count.Environment, count => count.Count)
        );
    }

    [Fact]
    public async Task HasSucceededDeployBefore_LooksOnlyAtEarlierSuccessfulDeploysToTheEnvironment()
    {
        DeploymentEntity first = await Deploy("app", "tt02", buildResult: BuildResult.Failed);
        DeploymentEntity second = await Deploy("app", "tt02");
        await Deploy("app", "production");
        DeploymentEntity third = await Deploy("app", "tt02");

        var repository = new DeploymentRepository(DbFixture.DbContext);

        Assert.False(await HasSucceededDeployBefore(repository, first));
        Assert.False(await HasSucceededDeployBefore(repository, second));
        Assert.True(await HasSucceededDeployBefore(repository, third));
    }

    private Task<bool> HasSucceededDeployBefore(DeploymentRepository repository, DeploymentEntity deployment) =>
        repository.HasSucceededDeployBefore(
            _org,
            deployment.App,
            deployment.EnvName,
            deployment.SequenceNo,
            CancellationToken.None
        );

    private async Task<DeploymentEntity> Deploy(
        string app,
        string environment,
        DeploymentType deploymentType = DeploymentType.Deploy,
        DeployEventType? finalEvent = null,
        BuildResult buildResult = BuildResult.Succeeded
    )
    {
        DeploymentEntity deployment = EntityGenerationUtils.Deployment.GenerateDeploymentEntity(
            _org,
            app,
            buildResult: buildResult,
            envName: environment,
            deploymentType: deploymentType
        );
        await DbFixture.PrepareEntityInDatabase(deployment);
        if (finalEvent is not null)
        {
            await DbFixture.PrepareDeployEventInDatabase(
                _org,
                deployment.Build.Id,
                new DeployEvent
                {
                    EventType = finalEvent.Value,
                    Message = finalEvent.Value.ToString(),
                    Timestamp = DateTimeOffset.UtcNow,
                    Created = DateTimeOffset.UtcNow,
                    Origin = DeployEventOrigin.Webhook,
                }
            );
        }
        return deployment;
    }
}

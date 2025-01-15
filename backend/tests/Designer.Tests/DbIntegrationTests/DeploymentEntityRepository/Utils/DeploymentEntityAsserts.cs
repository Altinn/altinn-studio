using System;
using System.Text.Json;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.Repository.ORMImplementation.Models;

namespace Designer.Tests.DbIntegrationTests;

public static partial class EntityAssertions
{
    public static void AssertEqual(DeploymentEntity deploymentEntity, Altinn.Studio.Designer.Repository.ORMImplementation.Models.DeploymentDbModel dbRecord)
    {
        dbRecord.App.Should().BeEquivalentTo(deploymentEntity.App);
        dbRecord.Org.Should().BeEquivalentTo(deploymentEntity.Org);
        dbRecord.Buildid.Should().BeEquivalentTo(deploymentEntity.Build.Id);
        dbRecord.Buildresult.Should().BeEquivalentTo(deploymentEntity.Build.Result.ToString());
        dbRecord.Tagname.Should().BeEquivalentTo(deploymentEntity.TagName);
        dbRecord.EnvName.Should().BeEquivalentTo(deploymentEntity.EnvName);
        var entityFromColumn = JsonSerializer.Deserialize<DeploymentEntity>(dbRecord.Entity, JsonOptions);
        entityFromColumn.Should().BeEquivalentTo(deploymentEntity);

        Altinn.Studio.Designer.Repository.ORMImplementation.Models.BuildDbModel buildDbModel = dbRecord.Build;
        buildDbModel.ExternalId.Should().BeEquivalentTo(deploymentEntity.Build.Id);
        buildDbModel.Status.Should().BeEquivalentTo(deploymentEntity.Build.Status.ToString());
        buildDbModel.Result.Should().BeEquivalentTo(deploymentEntity.Build.Result.ToString());
        buildDbModel.BuildType.Should().Be(BuildType.Deployment);

        buildDbModel.Started!.Value.UtcDateTime.Should().BeCloseTo(deploymentEntity.Build.Started!.Value, TimeSpan.FromMilliseconds(100));

        if (!buildDbModel.Finished.HasValue)
        {
            deploymentEntity.Build.Finished.Should().BeNull();
        }
        else
        {
            buildDbModel.Finished!.Value.UtcDateTime.Should().BeCloseTo(deploymentEntity.Build.Finished!.Value, TimeSpan.FromMilliseconds(100));
        }
    }
}

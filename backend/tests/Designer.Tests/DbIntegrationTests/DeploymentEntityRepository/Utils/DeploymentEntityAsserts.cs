using System.Text.Json;
using Altinn.Studio.Designer.Repository.Models;
using FluentAssertions;

namespace Designer.Tests.DbIntegrationTests;

public static partial class EntityAssertions
{
    public static void AssertEqual(DeploymentEntity deploymentEntity, Altinn.Studio.Designer.Repository.ORMImplementation.Models.Deployment dbRecord)
    {
        dbRecord.App.Should().BeEquivalentTo(deploymentEntity.App);
        dbRecord.Org.Should().BeEquivalentTo(deploymentEntity.Org);
        dbRecord.Buildid.Should().BeEquivalentTo(deploymentEntity.Build.Id);
        dbRecord.Buildresult.Should().BeEquivalentTo(deploymentEntity.Build.Result.ToString());
        dbRecord.Tagname.Should().BeEquivalentTo(deploymentEntity.TagName);
        var entityFromColumn = JsonSerializer.Deserialize<DeploymentEntity>(dbRecord.Entity, JsonOptions);
        entityFromColumn.Should().BeEquivalentTo(deploymentEntity);
    }
}

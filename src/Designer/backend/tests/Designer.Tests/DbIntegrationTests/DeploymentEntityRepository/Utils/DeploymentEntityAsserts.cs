#nullable disable
using System;
using System.Text.Json;
using Altinn.AccessManagement.Tests.Utils;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.Repository.ORMImplementation.Models;
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps.Enums;
using Xunit;

namespace Designer.Tests.DbIntegrationTests;

public static partial class EntityAssertions
{
    public static void AssertEqual(DeploymentEntity deploymentEntity, Altinn.Studio.Designer.Repository.ORMImplementation.Models.DeploymentDbModel dbRecord)
    {
        Assert.Equal(dbRecord.App, deploymentEntity.App);
        Assert.Equal(dbRecord.Org, deploymentEntity.Org);
        Assert.Equal(dbRecord.CreatedBy, deploymentEntity.CreatedBy);
        Assert.Equal(dbRecord.Buildid, deploymentEntity.Build.Id);
        Assert.Equal(dbRecord.Buildresult, deploymentEntity.Build.Result.ToEnumMemberAttributeValue());
        Assert.Equal(dbRecord.Tagname, deploymentEntity.TagName);
        Assert.Equal(dbRecord.EnvName, deploymentEntity.EnvName);
        var entityFromColumn = JsonSerializer.Deserialize<DeploymentEntity>(dbRecord.Entity, JsonOptions);
        AssertionUtil.AssertEqualTo(deploymentEntity, entityFromColumn);

        Altinn.Studio.Designer.Repository.ORMImplementation.Models.BuildDbModel buildDbModel = dbRecord.Build;
        Assert.Equal(buildDbModel.ExternalId, deploymentEntity.Build.Id);
        Assert.Equal(buildDbModel.Status, deploymentEntity.Build.Status.ToString());
        Assert.Equal(buildDbModel.Result, deploymentEntity.Build.Result.ToString());
        Assert.Equal(BuildType.Deployment, buildDbModel.BuildType);

        AssertionUtil.AssertCloseTo(buildDbModel.Started!.Value.UtcDateTime, deploymentEntity.Build.Started!.Value, TimeSpan.FromMilliseconds(100));

        if (!buildDbModel.Finished.HasValue)
        {
            Assert.Null(deploymentEntity.Build.Finished);
        }
        else
        {
            AssertionUtil.AssertCloseTo(buildDbModel.Finished!.Value.UtcDateTime, deploymentEntity.Build.Finished!.Value, TimeSpan.FromMilliseconds(100));
        }
    }

    public static void AssertEqual(DeploymentEntity expected, DeploymentEntity actual, TimeSpan datesTolerance)
    {
        Assert.Equal(expected.App, actual.App);
        Assert.Equal(expected.Org, actual.Org);
        Assert.Equal(expected.CreatedBy, actual.CreatedBy);
        AssertionUtil.AssertCloseTo(expected.Created, actual.Created, datesTolerance);
        Assert.Equal(expected.TagName, actual.TagName);
        Assert.Equal(expected.EnvName, actual.EnvName);
        Assert.Equal(expected.Build.Id, actual.Build.Id);
        Assert.Equal(expected.Build.Status, actual.Build.Status);
        Assert.Equal(expected.Build.Result, actual.Build.Result);

        if (!expected.Build.Started.HasValue)
        {
            Assert.Null(expected.Build.Started);
            Assert.Null(actual.Build.Started);
        }
        else
        {
            AssertionUtil.AssertCloseTo(expected.Build.Started.Value, actual.Build.Started.Value, datesTolerance);
        }

        if (!expected.Build.Finished.HasValue)
        {
            Assert.Null(expected.Build.Finished);
            Assert.Null(actual.Build.Finished);
        }
        else
        {
            AssertionUtil.AssertCloseTo(expected.Build.Finished.Value, actual.Build.Finished.Value, datesTolerance);
        }
    }
}

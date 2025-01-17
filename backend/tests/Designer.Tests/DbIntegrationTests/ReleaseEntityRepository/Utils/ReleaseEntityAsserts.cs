using System;
using System.Text.Json;
using Altinn.AccessManagement.Tests.Utils;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps.Enums;
using Xunit;

namespace Designer.Tests.DbIntegrationTests;

public static partial class EntityAssertions
{

    public static void AssertEqual(ReleaseEntity releaseEntity, Altinn.Studio.Designer.Repository.ORMImplementation.Models.ReleaseDbModel dbRecord)
    {
        Assert.Equal(dbRecord.App, releaseEntity.App);
        Assert.Equal(dbRecord.Org, releaseEntity.Org);
        Assert.Equal(dbRecord.Buildid, releaseEntity.Build.Id);
        Assert.Equal(dbRecord.Buildresult, releaseEntity.Build.Result.ToEnumMemberAttributeValue());
        Assert.Equal(dbRecord.Tagname, releaseEntity.TagName);
        var entityFromColumn = JsonSerializer.Deserialize<ReleaseEntity>(dbRecord.Entity, JsonOptions);
        AssertionUtil.AssertEqualTo(entityFromColumn, releaseEntity);

        AssertionUtil.AssertCloseTo(dbRecord.Created, releaseEntity.Created, TimeSpan.FromMilliseconds(100));
    }
}

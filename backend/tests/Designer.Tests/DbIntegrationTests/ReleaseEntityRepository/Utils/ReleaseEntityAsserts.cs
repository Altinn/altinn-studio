using System.Text.Json;
using Altinn.Studio.Designer.Repository.Models;
using FluentAssertions;

namespace Designer.Tests.DbIntegrationTests;

public static partial class EntityAssertions
{

    public static void AssertEqual(ReleaseEntity releaseEntity, Altinn.Studio.Designer.Repository.ORMImplementation.Models.Release dbRecord)
    {
        dbRecord.App.Should().BeEquivalentTo(releaseEntity.App);
        dbRecord.Org.Should().BeEquivalentTo(releaseEntity.Org);
        dbRecord.Buildid.Should().BeEquivalentTo(releaseEntity.Build.Id);
        dbRecord.Buildresult.Should().BeEquivalentTo(releaseEntity.Build.Result.ToString());
        dbRecord.Tagname.Should().BeEquivalentTo(releaseEntity.TagName);
        dbRecord.Created.Should().Be(releaseEntity.Created);
        var entityFromColumn = JsonSerializer.Deserialize<ReleaseEntity>(dbRecord.Entity, JsonOptions);
        entityFromColumn.Should().BeEquivalentTo(releaseEntity);
    }
}

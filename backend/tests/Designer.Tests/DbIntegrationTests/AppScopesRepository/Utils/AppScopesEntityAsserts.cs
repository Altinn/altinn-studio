using System.Collections.Generic;
using System.Text.Json;
using Altinn.Studio.Designer.Repository.Models.AppScope;
using FluentAssertions;

namespace Designer.Tests.DbIntegrationTests;

public partial class EntityAssertions
{
    public static void AssertEqual(AppScopesEntity appScopesEntity, Altinn.Studio.Designer.Repository.ORMImplementation.Models.AppScopesDbObject dbRecord)
    {
        dbRecord.App.Should().BeEquivalentTo(appScopesEntity.App);
        dbRecord.Org.Should().BeEquivalentTo(appScopesEntity.Org);
        dbRecord.CreatedBy.Should().BeEquivalentTo(appScopesEntity.CreatedBy);
        dbRecord.LastModifiedBy.Should().BeEquivalentTo(appScopesEntity.LastModifiedBy);
        dbRecord.Created.Should().Be(appScopesEntity.Created);
        dbRecord.Version.Should().Be(appScopesEntity.Version);
        var scopesFromDb = JsonSerializer.Deserialize<ISet<MaskinPortenScopeEntity>>(dbRecord.Scopes, JsonOptions);
        scopesFromDb.Should().BeEquivalentTo(appScopesEntity.Scopes);
        dbRecord.Version.Should().Be(appScopesEntity.Version);
    }

}

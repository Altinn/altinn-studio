using System;
using System.Collections.Generic;
using System.Text.Json;
using Altinn.Studio.Designer.Repository.Models.AppScope;
using FluentAssertions;

namespace Designer.Tests.DbIntegrationTests;

public partial class EntityAssertions
{
    public static void AssertEqual(AppScopesEntity appScopesEntity, Altinn.Studio.Designer.Repository.ORMImplementation.Models.AppScopesDbModel dbRecord)
    {
        dbRecord.App.Should().BeEquivalentTo(appScopesEntity.App);
        dbRecord.Org.Should().BeEquivalentTo(appScopesEntity.Org);
        dbRecord.CreatedBy.Should().BeEquivalentTo(appScopesEntity.CreatedBy);
        dbRecord.LastModifiedBy.Should().BeEquivalentTo(appScopesEntity.LastModifiedBy);
        dbRecord.Created.Should().BeCloseTo(appScopesEntity.Created, TimeSpan.FromMilliseconds(100));

        dbRecord.Version.Should().Be(appScopesEntity.Version);
        var scopesFromDb = JsonSerializer.Deserialize<ISet<MaskinPortenScopeEntity>>(dbRecord.Scopes, JsonOptions);
        scopesFromDb.Should().BeEquivalentTo(appScopesEntity.Scopes);
        dbRecord.Version.Should().Be(appScopesEntity.Version);
    }

    public static void AssertEqual(AppScopesEntity expected, AppScopesEntity actual)
    {
        actual.App.Should().Be(expected.App);
        actual.Org.Should().Be(expected.Org);
        actual.CreatedBy.Should().Be(expected.CreatedBy);
        actual.LastModifiedBy.Should().Be(expected.LastModifiedBy);
        actual.Created.Should().BeCloseTo(expected.Created, TimeSpan.FromMilliseconds(100));

        actual.Version.Should().Be(expected.Version);
        actual.Scopes.Should().BeEquivalentTo(expected.Scopes);
    }

}

using System;
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
        // Allow precision loss up to 100 milliseconds
        TimeSpan tolerance = TimeSpan.FromMilliseconds(100);
        TimeSpan difference = (appScopesEntity.Created - dbRecord.Created).Duration();
        bool isWithinTolerance = difference <= tolerance;
        isWithinTolerance.Should().BeTrue();

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
        // Allow precision loss up to 100 milliseconds
        TimeSpan tolerance = TimeSpan.FromMilliseconds(100);
        TimeSpan difference = (expected.Created - actual.Created).Duration();
        bool isWithinTolerance = difference <= tolerance;
        isWithinTolerance.Should().BeTrue();

        actual.Version.Should().Be(expected.Version);
        actual.Scopes.Should().BeEquivalentTo(expected.Scopes);
    }

}

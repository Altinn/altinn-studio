using System;
using System.Collections.Generic;
using System.Text.Json;
using Altinn.AccessManagement.Tests.Utils;
using Altinn.Studio.Designer.Repository.Models.AppScope;
using Xunit;

namespace Designer.Tests.DbIntegrationTests;

public partial class EntityAssertions
{
    public static void AssertEqual(AppScopesEntity appScopesEntity, Altinn.Studio.Designer.Repository.ORMImplementation.Models.AppScopesDbModel dbRecord)
    {
        Assert.Equal(dbRecord.App, appScopesEntity.App);
        Assert.Equal(dbRecord.Org, appScopesEntity.Org);
        Assert.Equal(dbRecord.CreatedBy, appScopesEntity.CreatedBy);
        Assert.Equal(dbRecord.LastModifiedBy, appScopesEntity.LastModifiedBy);
        AssertionUtil.AssertCloseTo(dbRecord.Created, appScopesEntity.Created, TimeSpan.FromMilliseconds(100));

        Assert.Equal(dbRecord.Version, appScopesEntity.Version);
        var scopesFromDb = JsonSerializer.Deserialize<ISet<MaskinPortenScopeEntity>>(dbRecord.Scopes, JsonOptions);
        AssertionUtil.AssertEqualTo(scopesFromDb, appScopesEntity.Scopes);
        Assert.Equal(dbRecord.Version, appScopesEntity.Version);
    }

    public static void AssertEqual(AppScopesEntity expected, AppScopesEntity actual)
    {
        Assert.Equal(expected.App, actual.App);
        Assert.Equal(expected.Org, actual.Org);
        Assert.Equal(expected.CreatedBy, actual.CreatedBy);
        Assert.Equal(expected.LastModifiedBy, actual.LastModifiedBy);
        AssertionUtil.AssertCloseTo(expected.Created, actual.Created, TimeSpan.FromMilliseconds(100));

        Assert.Equal(expected.Version, actual.Version);
        AssertionUtil.AssertEqualTo(expected.Scopes, actual.Scopes);
    }

}

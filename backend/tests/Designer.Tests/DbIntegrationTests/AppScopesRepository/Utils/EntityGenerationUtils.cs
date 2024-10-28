using System;
using System.Collections.Generic;
using System.Linq;
using Altinn.Studio.Designer.Repository.Models.AppScope;

namespace Designer.Tests.DbIntegrationTests;

public static partial class EntityGenerationUtils
{
    public static class AppScopes
    {
        public static AppScopesEntity GenerateAppScopesEntity(string org, string app = null, int numberOfScopes = 3, string developer = "testUser")
        {
            return new AppScopesEntity
            {
                Org = org,
                App = app ?? Guid.NewGuid().ToString(),
                CreatedBy = developer,
                LastModifiedBy = developer,
                Created = DateTimeOffset.UtcNow,
                Scopes = GenerateMaskinPortenScopeEntities(numberOfScopes),
            };
        }

        public static MaskinPortenScopeEntity GenerateMaskinPortenScopeEntity() =>
            new()
            {
                Scope = Guid.NewGuid().ToString(),
                Description = Guid.NewGuid().ToString(),
            };

        public static ISet<MaskinPortenScopeEntity> GenerateMaskinPortenScopeEntities(int count) =>
            Enumerable.Range(0, count)
                .Select(x => GenerateMaskinPortenScopeEntity()).ToHashSet();
    }

}

using System.Collections.Generic;
using System.Text.Json;
using System.Text.Json.Serialization;
using Altinn.Studio.Designer.Repository.Models.AppScope;
using Altinn.Studio.Designer.Repository.ORMImplementation.Models;

namespace Altinn.Studio.Designer.Repository.ORMImplementation.Mappers;

public class AppScopesMapper
{
    private static readonly JsonSerializerOptions s_jsonOptions = new JsonSerializerOptions
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false
    };

    public static AppScopesDbObject MapToDbModel(AppScopesEntity appScopes)
    {
        return new AppScopesDbObject
        {
            Id = appScopes.Id,
            App = appScopes.App,
            Org = appScopes.Org,
            Created = appScopes.Created.ToUniversalTime(),
            Scopes = JsonSerializer.Serialize(appScopes.Scopes, s_jsonOptions),
            CreatedBy = appScopes.CreatedBy,
            LastModifiedBy = appScopes.LastModifiedBy
        };
    }

    public static AppScopesEntity MapToModel(AppScopesDbObject appScopesDbObject)
    {
        return new AppScopesEntity
        {
            Id = appScopesDbObject.Id,
            App = appScopesDbObject.App,
            Org = appScopesDbObject.Org,
            Created = appScopesDbObject.Created.ToLocalTime(),
            Scopes = JsonSerializer.Deserialize<ISet<MaskinPortenScopeEntity>>(appScopesDbObject.Scopes, s_jsonOptions),
            CreatedBy = appScopesDbObject.CreatedBy,
            LastModifiedBy = appScopesDbObject.LastModifiedBy
        };
    }
}

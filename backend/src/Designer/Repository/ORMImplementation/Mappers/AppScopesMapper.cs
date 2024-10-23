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
            App = appScopes.App,
            Org = appScopes.Org,
            Created = appScopes.Created,
            Scopes = JsonSerializer.Serialize(appScopes.Scopes, s_jsonOptions),
            CreatedBy = appScopes.CreatedBy,
            LastModifiedBy = appScopes.LastModifiedBy
        };
    }

    public static AppScopesDbObject MapToDbModel(AppScopesEntity appScopes, long id)
    {
        var dbModel = MapToDbModel(appScopes);
        dbModel.Id = id;
        return dbModel;
    }

    public static AppScopesEntity MapToModel(AppScopesDbObject appScopesDbObject)
    {
        return new AppScopesEntity
        {
            App = appScopesDbObject.App,
            Org = appScopesDbObject.Org,
            Created = appScopesDbObject.Created,
            Scopes = JsonSerializer.Deserialize<ISet<MaskinPortenScopeEntity>>(appScopesDbObject.Scopes, s_jsonOptions),
            CreatedBy = appScopesDbObject.CreatedBy,
            LastModifiedBy = appScopesDbObject.LastModifiedBy
        };
    }
}

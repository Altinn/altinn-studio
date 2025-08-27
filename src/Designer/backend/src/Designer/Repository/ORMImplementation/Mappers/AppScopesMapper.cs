using System.Collections.Generic;
using System.Text.Json;
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

    public static AppScopesDbModel MapToDbModel(AppScopesEntity appScopes)
    {
        return new AppScopesDbModel
        {
            App = appScopes.App,
            Org = appScopes.Org,
            Created = appScopes.Created,
            Scopes = JsonSerializer.Serialize(appScopes.Scopes, s_jsonOptions),
            CreatedBy = appScopes.CreatedBy,
            LastModifiedBy = appScopes.LastModifiedBy,
            Version = appScopes.Version
        };
    }

    public static AppScopesDbModel MapToDbModel(AppScopesEntity appScopes, long id)
    {
        var dbModel = MapToDbModel(appScopes);
        dbModel.Id = id;
        return dbModel;
    }

    public static AppScopesEntity MapToModel(AppScopesDbModel appScopesDbModel)
    {
        return new AppScopesEntity
        {
            App = appScopesDbModel.App,
            Org = appScopesDbModel.Org,
            Created = appScopesDbModel.Created,
            Scopes = JsonSerializer.Deserialize<ISet<MaskinPortenScopeEntity>>(appScopesDbModel.Scopes, s_jsonOptions),
            CreatedBy = appScopesDbModel.CreatedBy,
            LastModifiedBy = appScopesDbModel.LastModifiedBy,
            Version = appScopesDbModel.Version
        };
    }
}

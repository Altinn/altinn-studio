using Altinn.Studio.Designer.Repository.Models.AppSettings;
using Altinn.Studio.Designer.Repository.ORMImplementation.Models;

namespace Altinn.Studio.Designer.Repository.ORMImplementation.Mappers;

public static class AppSettingsMapper
{
    public static AppSettingsDbModel MapToDbModel(AppSettingsEntity entity)
    {
        return new AppSettingsDbModel
        {
            Org = entity.Org,
            App = entity.App,
            Environment = entity.Environment,
            UndeployOnInactivity = entity.UndeployOnInactivity,
            Created = entity.Created,
            CreatedBy = entity.CreatedBy,
            LastModifiedBy = entity.LastModifiedBy,
            Version = entity.Version
        };
    }

    public static AppSettingsDbModel MapToDbModel(AppSettingsEntity entity, long id)
    {
        var dbModel = MapToDbModel(entity);
        dbModel.Id = id;
        return dbModel;
    }

    public static AppSettingsEntity MapToModel(AppSettingsDbModel dbModel)
    {
        return new AppSettingsEntity
        {
            Org = dbModel.Org,
            App = dbModel.App,
            Environment = dbModel.Environment,
            UndeployOnInactivity = dbModel.UndeployOnInactivity,
            Created = dbModel.Created,
            CreatedBy = dbModel.CreatedBy,
            LastModifiedBy = dbModel.LastModifiedBy,
            Version = dbModel.Version
        };
    }
}

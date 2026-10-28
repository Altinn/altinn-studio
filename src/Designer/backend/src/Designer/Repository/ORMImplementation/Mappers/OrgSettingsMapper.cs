using Altinn.Studio.Designer.Repository.Models.OrgSettings;
using Altinn.Studio.Designer.Repository.ORMImplementation.Models;

namespace Altinn.Studio.Designer.Repository.ORMImplementation.Mappers;

public static class OrgSettingsMapper
{
    public static OrgSettingsDbModel MapToDbModel(OrgSettingsEntity entity)
    {
        return new OrgSettingsDbModel
        {
            Org = entity.Org,
            UndeployOnInactivity = entity.UndeployOnInactivity,
            InactivityPeriodDays = entity.InactivityPeriodDays,
            Created = entity.Created,
            CreatedBy = entity.CreatedBy,
            LastModifiedBy = entity.LastModifiedBy,
        };
    }

    public static OrgSettingsEntity MapToModel(OrgSettingsDbModel dbModel)
    {
        return new OrgSettingsEntity
        {
            Org = dbModel.Org,
            UndeployOnInactivity = dbModel.UndeployOnInactivity,
            InactivityPeriodDays = dbModel.InactivityPeriodDays,
            Created = dbModel.Created,
            CreatedBy = dbModel.CreatedBy,
            LastModifiedBy = dbModel.LastModifiedBy,
        };
    }
}

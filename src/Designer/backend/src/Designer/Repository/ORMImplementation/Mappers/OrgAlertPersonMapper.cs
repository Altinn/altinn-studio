using System.Collections.Generic;
using System.Text.Json;
using Altinn.Studio.Designer.Repository.Models.OrgAlertPerson;
using Altinn.Studio.Designer.Repository.ORMImplementation.Models;

namespace Altinn.Studio.Designer.Repository.ORMImplementation.Mappers;

public static class OrgAlertPersonMapper
{
    private static readonly JsonSerializerOptions s_jsonOptions = new() { WriteIndented = false };

    public static OrgAlertPersonDbModel MapToDbModel(OrgAlertPersonEntity entity)
    {
        return new OrgAlertPersonDbModel
        {
            Id = entity.Id,
            Org = entity.Org,
            Name = entity.Name,
            Email = entity.Email,
            EmailSeverity = entity.EmailSeverity,
            Phone = entity.Phone,
            SmsSeverity = entity.SmsSeverity,
            IsActive = entity.IsActive,
            CreatedAt = entity.CreatedAt,
            Services = entity.Services is null ? null : JsonSerializer.Serialize(entity.Services, s_jsonOptions),
        };
    }

    public static OrgAlertPersonEntity MapToEntity(OrgAlertPersonDbModel dbModel)
    {
        return new OrgAlertPersonEntity
        {
            Id = dbModel.Id,
            Org = dbModel.Org,
            Name = dbModel.Name,
            Email = dbModel.Email,
            EmailSeverity = dbModel.EmailSeverity,
            Phone = dbModel.Phone,
            SmsSeverity = dbModel.SmsSeverity,
            IsActive = dbModel.IsActive,
            CreatedAt = dbModel.CreatedAt,
            Services = dbModel.Services is null
                ? null
                : JsonSerializer.Deserialize<List<string>>(dbModel.Services, s_jsonOptions),
        };
    }
}

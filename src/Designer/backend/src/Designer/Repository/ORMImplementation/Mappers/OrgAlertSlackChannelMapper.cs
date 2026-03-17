using System.Collections.Generic;
using System.Text.Json;
using Altinn.Studio.Designer.Repository.Models.OrgAlertSlackChannel;
using Altinn.Studio.Designer.Repository.ORMImplementation.Models;

namespace Altinn.Studio.Designer.Repository.ORMImplementation.Mappers;

public static class OrgAlertSlackChannelMapper
{
    private static readonly JsonSerializerOptions s_jsonOptions = new() { WriteIndented = false };

    public static OrgAlertSlackChannelDbModel MapToDbModel(OrgAlertSlackChannelEntity entity)
    {
        return new OrgAlertSlackChannelDbModel
        {
            Id = entity.Id,
            Org = entity.Org,
            ChannelName = entity.ChannelName,
            SlackId = entity.SlackId,
            Severity = entity.Severity,
            IsActive = entity.IsActive,
            CreatedAt = entity.CreatedAt,
            Services = entity.Services is null ? null : JsonSerializer.Serialize(entity.Services, s_jsonOptions),
        };
    }

    public static OrgAlertSlackChannelEntity MapToEntity(OrgAlertSlackChannelDbModel dbModel)
    {
        return new OrgAlertSlackChannelEntity
        {
            Id = dbModel.Id,
            Org = dbModel.Org,
            ChannelName = dbModel.ChannelName,
            SlackId = dbModel.SlackId,
            Severity = dbModel.Severity,
            IsActive = dbModel.IsActive,
            CreatedAt = dbModel.CreatedAt,
            Services = dbModel.Services is null
                ? null
                : JsonSerializer.Deserialize<List<string>>(dbModel.Services, s_jsonOptions),
        };
    }
}

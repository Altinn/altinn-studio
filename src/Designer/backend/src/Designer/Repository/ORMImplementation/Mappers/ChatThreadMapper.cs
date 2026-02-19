#nullable disable
using System.Linq;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.Repository.ORMImplementation.Models;

namespace Altinn.Studio.Designer.Repository.ORMImplementation.Mappers;

public static class ChatThreadMapper
{
    public static ChatThreadDbModel MapToDbModel(ChatThreadEntity entity)
    {
        return new ChatThreadDbModel
        {
            Id = entity.Id,
            Title = entity.Title,
            Org = entity.Org,
            App = entity.App,
            CreatedBy = entity.CreatedBy,
            CreatedAt = entity.CreatedAt
        };
    }

    public static ChatThreadEntity MapToModel(ChatThreadDbModel dbModel)
    {
        return new ChatThreadEntity
        {
            Id = dbModel.Id,
            Title = dbModel.Title,
            Org = dbModel.Org,
            App = dbModel.App,
            CreatedBy = dbModel.CreatedBy,
            CreatedAt = dbModel.CreatedAt,
            Messages = dbModel.Messages?.Select(ChatMessageMapper.MapToModel).ToList()
        };
    }

}

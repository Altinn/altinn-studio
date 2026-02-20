using System.Linq;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.Repository.ORMImplementation.Models;

namespace Altinn.Studio.Designer.Repository.ORMImplementation.Mappers;

public static class ChatMessageMapper
{
    public static ChatMessageDbModel MapToDbModel(ChatMessageEntity entity)
    {
        return new ChatMessageDbModel
        {
            Id = entity.Id,
            ThreadId = entity.ThreadId,
            CreatedAt = entity.CreatedAt,
            Role = entity.Role,
            Content = entity.Content,
            ActionMode = entity.ActionMode,
            FilesChanged = entity.FilesChanged
        };
    }

    public static ChatMessageEntity MapToModel(ChatMessageDbModel dbModel)
    {
        return new ChatMessageEntity
        {
            Id = dbModel.Id,
            ThreadId = dbModel.ThreadId,
            CreatedAt = dbModel.CreatedAt,
            Role = dbModel.Role,
            Content = dbModel.Content,
            ActionMode = dbModel.ActionMode,
            FilesChanged = dbModel.FilesChanged,
            Attachments = dbModel.Attachments.Select(ChatAttachmentMapper.MapToModel).ToList()
        };
    }

}

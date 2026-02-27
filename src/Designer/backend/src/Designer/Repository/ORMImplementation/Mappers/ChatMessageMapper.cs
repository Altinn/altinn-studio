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
            CreatedAt = entity.CreatedAt,
            Role = entity.Role,
            Content = entity.Content,
            ActionMode = entity.ActionMode,
            FilesChanged = entity.FilesChanged,
            AttachmentFileNames = entity.AttachmentFileNames,
        };
    }

    public static ChatMessageEntity MapToModel(ChatMessageDbModel dbModel)
    {
        return new ChatMessageEntity
        {
            Id = dbModel.Id,
            CreatedAt = dbModel.CreatedAt,
            Role = dbModel.Role,
            Content = dbModel.Content,
            ActionMode = dbModel.ActionMode,
            FilesChanged = dbModel.FilesChanged,
            AttachmentFileNames = dbModel.AttachmentFileNames,
        };
    }
}

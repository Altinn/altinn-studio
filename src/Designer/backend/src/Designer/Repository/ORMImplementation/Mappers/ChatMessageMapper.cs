using System.Collections.Generic;
using System.Text.Json;
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
            CreatedAt = entity.CreatedAt.ToUniversalTime(),
            Role = entity.Role,
            Content = entity.Content,
            AllowAppChanges = entity.AllowAppChanges,
            FilesChanged = entity.FilesChanged,
            AttachmentFileNames = entity.AttachmentFileNames,
            Sources = entity.Sources is null ? null : JsonSerializer.Serialize(entity.Sources),
            AttachmentInstructionFlagged = entity.AttachmentInstructionFlagged,
            TraceId = entity.TraceId,
            EventId = entity.EventId,
            FeedbackThumbsUp = entity.FeedbackThumbsUp,
        };
    }

    public static ChatMessageEntity MapToModel(ChatMessageDbModel dbModel)
    {
        return new ChatMessageEntity
        {
            Id = dbModel.Id,
            ThreadId = dbModel.ThreadId,
            CreatedAt = dbModel.CreatedAt.ToUniversalTime(),
            Role = dbModel.Role,
            Content = dbModel.Content,
            AllowAppChanges = dbModel.AllowAppChanges,
            FilesChanged = dbModel.FilesChanged,
            AttachmentFileNames = dbModel.AttachmentFileNames,
            Sources = dbModel.Sources is null
                ? null
                : JsonSerializer.Deserialize<List<ChatSourceEntity>>(dbModel.Sources),
            AttachmentInstructionFlagged = dbModel.AttachmentInstructionFlagged,
            TraceId = dbModel.TraceId,
            EventId = dbModel.EventId,
            FeedbackThumbsUp = dbModel.FeedbackThumbsUp,
        };
    }
}

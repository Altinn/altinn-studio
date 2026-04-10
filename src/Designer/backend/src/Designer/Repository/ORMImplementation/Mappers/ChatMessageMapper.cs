using System.Collections.Generic;
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
            CreatedAt = entity.CreatedAt.ToUniversalTime(),
            Role = entity.Role,
            Content = entity.Content,
            AllowAppChanges = entity.AllowAppChanges,
            FilesChanged = entity.FilesChanged,
            AttachmentFileNames = entity.AttachmentFileNames,
            Sources = entity.Sources?.Select(MapSourceToDbModel).ToList(),
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
            Sources = dbModel.Sources?.Select(MapSourceToEntity).ToList(),
        };
    }

    private static ChatSourceDbModel MapSourceToDbModel(ChatSourceEntity source)
    {
        return new ChatSourceDbModel
        {
            Tool = source.Tool,
            Title = source.Title,
            PreviewText = source.PreviewText,
            ContentLength = source.ContentLength,
            Url = source.Url,
            Relevance = source.Relevance,
            MatchedTerms = source.MatchedTerms,
            Cited = source.Cited,
        };
    }

    private static ChatSourceEntity MapSourceToEntity(ChatSourceDbModel dbModel)
    {
        return new ChatSourceEntity
        {
            Tool = dbModel.Tool,
            Title = dbModel.Title,
            PreviewText = dbModel.PreviewText,
            ContentLength = dbModel.ContentLength,
            Url = dbModel.Url,
            Relevance = dbModel.Relevance,
            MatchedTerms = dbModel.MatchedTerms,
            Cited = dbModel.Cited,
        };
    }
}

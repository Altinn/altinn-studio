#nullable disable
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.Repository.ORMImplementation.Models;

namespace Altinn.Studio.Designer.Repository.ORMImplementation.Mappers;

public static class ChatAttachmentMapper
{
    public static ChatAttachmentDbModel MapToDbModel(ChatAttachmentEntity entity)
    {
        return new ChatAttachmentDbModel
        {
            Id = entity.Id,
            MessageId = entity.MessageId,
            FileName = entity.FileName,
            CreatedAt = entity.CreatedAt,
            MimeType = entity.MimeType,
            SizeBytes = entity.SizeBytes,
            BlobStorageKey = entity.BlobStorageKey
        };
    }

    public static ChatAttachmentEntity MapToModel(ChatAttachmentDbModel dbModel)
    {
        return new ChatAttachmentEntity
        {
            Id = dbModel.Id,
            MessageId = dbModel.MessageId,
            FileName = dbModel.FileName,
            CreatedAt = dbModel.CreatedAt,
            MimeType = dbModel.MimeType,
            SizeBytes = dbModel.SizeBytes,
            BlobStorageKey = dbModel.BlobStorageKey
        };
    }

}

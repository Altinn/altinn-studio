using System.Collections.Generic;
using Altinn.Studio.Designer.Enums;
using Altinn.Studio.Designer.Repository.Models;

namespace Altinn.Studio.Designer.Models.Dto;

public record CreateChatMessageRequest(
    Role Role,
    string Content,
    bool? AllowAppChanges,
    List<string>? AttachmentFileNames,
    List<string>? FilesChanged,
    List<ChatSourceEntity>? Sources
);

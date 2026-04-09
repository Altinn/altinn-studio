using System.Collections.Generic;

namespace Altinn.Studio.Designer.Models;

public record CreateChatThreadRequest(string Title);

public record UpdateChatThreadRequest(string Title);

public record CreateChatMessageRequest(
    string Role,
    string Content,
    string? ActionMode,
    List<string>? AttachmentFileNames,
    List<string>? FilesChanged
);

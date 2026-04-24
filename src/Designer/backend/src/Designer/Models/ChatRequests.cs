using System.Collections.Generic;
using Altinn.Studio.Designer.Enums;

namespace Altinn.Studio.Designer.Models;

public record CreateChatThreadRequest(string Title);

public record UpdateChatThreadRequest(string Title);

public record CreateChatMessageRequest(
    Role Role,
    string Content,
    bool? AllowAppChanges,
    List<string>? AttachmentFileNames,
    List<string>? FilesChanged,
    List<ChatSourceRequest>? Sources
);

public record ChatSourceRequest(
    string Tool,
    string Title,
    string? PreviewText,
    int? ContentLength,
    string? Url,
    double? Relevance,
    string? MatchedTerms,
    bool? Cited
);

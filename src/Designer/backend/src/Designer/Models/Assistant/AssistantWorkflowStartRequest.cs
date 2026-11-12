using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.Models.Assistant;

/// <summary>
/// The request that starts a workflow in the assistant service.
/// </summary>
/// <param name="SessionId">The ID of the chat thread.</param>
/// <param name="Goal">What the developer asks the assistant to do.</param>
/// <param name="RepoUrl">The app repository that the assistant clones.</param>
/// <param name="Branch">The branch that the assistant works on.</param>
/// <param name="AllowAppChanges">Whether the assistant may change the app, or only answer.</param>
/// <param name="CostOrg">The assistant service records the LLM usage of the workflow on this organization.</param>
/// <param name="Attachments">The files attached to the message.</param>
public sealed record AssistantWorkflowStartRequest(
    [property: JsonPropertyName("session_id")] string SessionId,
    [property: JsonPropertyName("goal")] string Goal,
    [property: JsonPropertyName("repo_url")] string RepoUrl,
    [property: JsonPropertyName("branch")] string Branch,
    [property: JsonPropertyName("allow_app_changes")] bool AllowAppChanges,
    [property: JsonPropertyName("cost_org")] string CostOrg,
    [property: JsonPropertyName("attachments")] IReadOnlyList<AssistantWorkflowAttachment> Attachments
);

/// <summary>
/// A file attached to a message to the assistant.
/// </summary>
/// <param name="Name">The file name.</param>
/// <param name="MimeType">The media type that the browser gave the file.</param>
/// <param name="Size">The size of the file in bytes.</param>
/// <param name="Content">The content of the file. JSON writes it as base64 text.</param>
public sealed record AssistantWorkflowAttachment(
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("mimeType")] string MimeType,
    [property: JsonPropertyName("size")] long Size,
    [property: JsonPropertyName("dataBase64")] byte[] Content
);

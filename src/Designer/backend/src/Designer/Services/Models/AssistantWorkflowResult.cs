using System.Text.Json;

namespace Altinn.Studio.Designer.Services.Models;

/// <summary>
/// How a command to the assistant's workflow in a chat thread ended.
/// </summary>
public enum AssistantWorkflowStatus
{
    /// <summary>
    /// The assistant service received the command.
    /// </summary>
    Success,

    /// <summary>
    /// The developer may not use the assistant for the repository.
    /// </summary>
    Forbidden,

    /// <summary>
    /// The developer has no such thread in the repository.
    /// </summary>
    NotFound,
}

/// <summary>
/// How a start of the assistant's workflow ended.
/// </summary>
/// <param name="Status">How the start ended.</param>
/// <param name="Response">The answer from the assistant service.</param>
public sealed record AssistantWorkflowStartResult(AssistantWorkflowStatus Status, JsonElement? Response = null);

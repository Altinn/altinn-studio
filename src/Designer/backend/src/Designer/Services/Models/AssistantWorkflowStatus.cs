namespace Altinn.Studio.Designer.Services.Models;

/// <summary>
/// The result of a command for the assistant workflow in a chat thread.
/// </summary>
public enum AssistantWorkflowStatus
{
    /// <summary>
    /// The assistant service received the command.
    /// </summary>
    Success,

    /// <summary>
    /// The developer cannot use the assistant for the repository.
    /// </summary>
    Forbidden,

    /// <summary>
    /// The developer has no such thread in the repository.
    /// </summary>
    NotFound,
}

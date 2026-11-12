using System.Collections.Generic;
using Microsoft.AspNetCore.Http;

namespace Altinn.Studio.Designer.Models.Dto;

/// <summary>
/// A developer's message to the assistant, with the files attached to it.
/// </summary>
public sealed class StartAssistantWorkflowRequest
{
    /// <summary>
    /// What the developer asks the assistant to do.
    /// </summary>
    public required string Goal { get; init; }

    /// <summary>
    /// The branch that the assistant works on.
    /// </summary>
    public required string Branch { get; init; }

    /// <summary>
    /// Whether the assistant may change the app, or only answer.
    /// </summary>
    public bool AllowAppChanges { get; init; }

    /// <summary>
    /// The files attached to the message.
    /// </summary>
    public List<IFormFile> Attachments { get; init; } = [];
}

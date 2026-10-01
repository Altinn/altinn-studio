using System.ComponentModel.DataAnnotations;

namespace Altinn.Studio.Designer.Models.Dto;

/// <summary>
/// A process edit in a v9 app: a complete BPMN snapshot and what it changes, made against the version of the
/// process state the editor last loaded.
/// </summary>
public sealed class ProcessEditRequest
{
    /// <summary>
    /// The loaded <see cref="ProcessState.Version"/>; a stale version is rejected.
    /// </summary>
    [Required]
    public required string ExpectedVersion { get; init; }

    public string? BpmnXml { get; init; }
    public ProcessDefinitionMetadata? Metadata { get; init; }
}

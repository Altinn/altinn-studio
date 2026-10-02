using System.ComponentModel.DataAnnotations;

namespace Altinn.Studio.Designer.Models.Dto;

/// <summary>
/// A versioned v9 edit: a BPMN snapshot with metadata, one layout-set or data-type operation, or a subform PDF change.
/// </summary>
public sealed class ProcessEditRequest
{
    /// <summary>
    /// The loaded <see cref="ProcessState.Version"/>; a stale version is rejected.
    /// </summary>
    [Required]
    public required string ExpectedVersion { get; init; }

    public string? BpmnXml { get; init; }

    /// <summary>
    /// A task ID change requires <see cref="BpmnXml"/>; a subform PDF component change can be sent alone.
    /// </summary>
    public ProcessDefinitionMetadata? Metadata { get; init; }

    public LayoutSetPayload? LayoutSetCreation { get; init; }
    public ProcessLayoutSetDeletion? LayoutSetDeletion { get; init; }
    public ProcessLayoutSetRename? LayoutSetRename { get; init; }
    public DataTypesChange? DataTypesChange { get; init; }
}

namespace Altinn.Studio.Designer.Models.Dto;

/// <summary>
/// Sent with the process definition when a subform PDF task set up with a Subform component now names its
/// subform's UI folder instead.
/// </summary>
public class SubformPdfConfigUpgrade
{
    public required string TaskId { get; set; }

    /// <summary>The Subform component the task named before, whose copy the task's UI folder holds.</summary>
    public required string SubformComponentId { get; set; }
}

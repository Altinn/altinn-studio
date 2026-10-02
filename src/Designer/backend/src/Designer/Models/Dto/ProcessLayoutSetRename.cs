namespace Altinn.Studio.Designer.Models.Dto;

/// <summary>
/// Renames a layout set and, when it belongs to a task, the task itself.
/// </summary>
public sealed record ProcessLayoutSetRename(string LayoutSetIdToUpdate, string NewLayoutSetId);

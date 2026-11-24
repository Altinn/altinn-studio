using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Extensions;

internal static class DataTypeExtensions
{
    /// <summary>
    /// Ignores the v8 <c>TaskId</c>, which binds nothing in v9.
    /// </summary>
    public static bool IsBoundToTask(this DataType dataType, string? taskId) =>
        taskId is not null && dataType.TaskIds?.Contains(taskId) is true;

    /// <summary>
    /// Whether the data type lists the tasks its data can change in. Storage ignores the lock on such data.
    /// </summary>
    public static bool IsTaskBound(this DataType dataType) => dataType.TaskIds is { Count: > 0 };

    /// <summary>
    /// Whether the data type's <c>taskIds</c> keep its data from changing in the instance's current task, whoever
    /// asks.
    /// </summary>
    public static bool HasTaskBindingConflict(this DataType dataType, Instance instance) =>
        dataType.IsTaskBound() && !dataType.IsBoundToTask(instance.Process?.CurrentTask?.ElementId);

    /// <summary>
    /// Whether the data type's <c>taskIds</c> and the element's lock let Storage accept new content for the element
    /// in the instance's current task, whoever sends it.
    /// </summary>
    public static bool IsWritableInCurrentTask(this DataType dataType, Instance instance, DataElement dataElement) =>
        !dataType.HasTaskBindingConflict(instance) && (dataType.IsTaskBound() || !dataElement.Locked);
}

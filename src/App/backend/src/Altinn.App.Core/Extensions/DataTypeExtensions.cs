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
    /// Whether Storage accepts a change to data of this type in the instance's current task, whoever makes it.
    /// </summary>
    public static bool IsWritableInCurrentTask(this DataType dataType, Instance instance) =>
        dataType.TaskIds is not { Count: > 0 } || dataType.IsBoundToTask(instance.Process?.CurrentTask?.ElementId);
}

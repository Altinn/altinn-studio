using Altinn.Platform.Storage.Interface.Models;

#pragma warning disable CS0618 // v8 apps bind a data type with TaskId

namespace Altinn.Studio.Designer.Helpers.Extensions;

/// <summary>
/// A v9 app reads only <see cref="DataType.TaskIds"/> and a v8 app only <see cref="DataType.TaskId"/>, so each
/// method touches only the one the app reads.
/// </summary>
public static class DataTypeExtensions
{
    public static bool IsBoundToAnyTask(this DataType dataType, bool usesTaskIds) =>
        usesTaskIds ? dataType.TaskIds is { Count: > 0 } : !string.IsNullOrEmpty(dataType.TaskId);

    /// <returns>Whether the data type changed.</returns>
    public static bool BindToTask(this DataType dataType, string taskId, bool usesTaskIds)
    {
        if (!usesTaskIds)
        {
            bool changed = dataType.TaskId != taskId;
            dataType.TaskId = taskId;
            return changed;
        }

        dataType.TaskIds ??= [];
        if (dataType.TaskIds.Contains(taskId))
        {
            return false;
        }

        dataType.TaskIds.Add(taskId);
        return true;
    }

    /// <returns>Whether the data type changed.</returns>
    public static bool UnbindFromTask(this DataType dataType, string taskId, bool usesTaskIds)
    {
        if (!usesTaskIds)
        {
            if (dataType.TaskId != taskId)
            {
                return false;
            }

            dataType.TaskId = null;
            return true;
        }

        return dataType.TaskIds?.Remove(taskId) ?? false;
    }

    /// <returns>Whether the data type changed.</returns>
    public static bool RenameTask(this DataType dataType, string oldTaskId, string newTaskId, bool usesTaskIds)
    {
        if (!usesTaskIds)
        {
            if (dataType.TaskId != oldTaskId)
            {
                return false;
            }

            dataType.TaskId = newTaskId;
            return true;
        }

        if (dataType.TaskIds is null)
        {
            return false;
        }

        int index = dataType.TaskIds.IndexOf(oldTaskId);
        if (index < 0)
        {
            return false;
        }

        dataType.TaskIds[index] = newTaskId;
        return true;
    }
}

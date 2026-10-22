using Altinn.Platform.Storage.Interface.Models;

#pragma warning disable CS0618 // Apps that do not read TaskIds bind a data type with TaskId

namespace Altinn.Studio.Designer.Helpers.Extensions;

/// <summary>
/// An app that reads <see cref="DataType.TaskIds"/> ignores <see cref="DataType.TaskId"/>; an older app reads only
/// <see cref="DataType.TaskId"/>. A <see cref="DataType.TaskIds"/> that exists is kept in step in every app, because
/// Storage enforces it whatever the app's version.
/// </summary>
public static class DataTypeExtensions
{
    public static bool IsBoundToAnyTask(this DataType dataType, bool usesTaskIds)
    {
        if (usesTaskIds)
        {
            return dataType.TaskIds is { Count: > 0 };
        }

        return !string.IsNullOrEmpty(dataType.TaskId);
    }

    /// <returns>Whether the data type changed.</returns>
    public static bool BindToTask(this DataType dataType, string taskId, bool usesTaskIds)
    {
        bool changed = false;
        if (usesTaskIds)
        {
            dataType.TaskIds ??= [];
        }

        if (dataType.TaskIds is not null && !dataType.TaskIds.Contains(taskId))
        {
            dataType.TaskIds.Add(taskId);
            changed = true;
        }

        if (!usesTaskIds)
        {
            if (dataType.TaskId != taskId)
            {
                dataType.TaskId = taskId;
                changed = true;
            }
        }

        return changed;
    }

    /// <returns>Whether the data type changed.</returns>
    public static bool UnbindFromTask(this DataType dataType, string taskId, bool usesTaskIds)
    {
        // An emptied list is kept: a missing list lets readers fall back to TaskId.
        bool changed =
            dataType.TaskIds is not null && dataType.TaskIds.RemoveAll(boundTaskId => boundTaskId == taskId) > 0;

        if (!usesTaskIds)
        {
            if (!string.IsNullOrEmpty(dataType.TaskId) && dataType.TaskId == taskId)
            {
                dataType.TaskId = null;
                changed = true;
            }
        }

        return changed;
    }

    /// <returns>Whether the data type changed.</returns>
    public static bool RenameTask(this DataType dataType, string oldTaskId, string newTaskId, bool usesTaskIds)
    {
        bool changed = false;
        if (dataType.TaskIds is not null)
        {
            for (int index = 0; index < dataType.TaskIds.Count; index++)
            {
                if (dataType.TaskIds[index] == oldTaskId)
                {
                    dataType.TaskIds[index] = newTaskId;
                    changed = true;
                }
            }
        }

        if (!usesTaskIds)
        {
            if (!string.IsNullOrEmpty(dataType.TaskId) && dataType.TaskId == oldTaskId)
            {
                dataType.TaskId = newTaskId;
                changed = true;
            }
        }

        return changed;
    }
}

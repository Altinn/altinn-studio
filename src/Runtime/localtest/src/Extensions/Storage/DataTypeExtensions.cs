#nullable disable

using Altinn.Platform.Storage.Authorization;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.Platform.Storage.Extensions;

public static class DataTypeExtensions
{
    public static async Task<bool> CanRead(
        this DataType dataType,
        IAuthorization authorizationService,
        Instance instance,
        CancellationToken cancellationToken,
        string task = null
    )
    {
        if (string.IsNullOrWhiteSpace(dataType.ActionRequiredToRead))
        {
            return true;
        }

        return await authorizationService.AuthorizeInstanceAction(
            instance,
            dataType.ActionRequiredToRead,
            task ?? instance.Process?.CurrentTask?.ElementId,
            cancellationToken
        );
    }

    public static async Task<bool> CanWrite(
        this DataType dataType,
        IAuthorization authorizationService,
        Instance instance,
        CancellationToken cancellationToken,
        string task = null
    )
    {
        if (string.IsNullOrWhiteSpace(dataType.ActionRequiredToWrite))
        {
            return true;
        }

        return await authorizationService.AuthorizeInstanceAction(
            instance,
            dataType.ActionRequiredToWrite,
            task ?? instance.Process?.CurrentTask?.ElementId,
            cancellationToken
        );
    }

    /// <summary>
    /// Returns why data of this type may not be written in the instance's current task, or null when it may.
    /// </summary>
    /// <remarks>
    /// Process transitions are exempt: the workflow engine moves the instance between tasks while it holds it in
    /// <see cref="ProcessStatus.Processing"/>, and asserts that status on every write it makes. The caller's identity
    /// plays no part; the app's own token outside a transition is bound like any other.
    /// </remarks>
    /// <param name="instance">The instance as loaded before the write.</param>
    /// <param name="isPartOfProcessTransition">
    /// Whether the request asserted <see cref="ProcessStatus.Processing"/> and the instance is processing.
    /// </param>
    public static string GetTaskBindingConflict(
        this DataType dataType,
        Instance instance,
        bool isPartOfProcessTransition
    )
    {
        if (dataType.TaskIds is not { Count: > 0 } taskIds || isPartOfProcessTransition)
        {
            return null;
        }

        string currentTask = instance.Process?.CurrentTask?.ElementId;
        if (currentTask is not null && taskIds.Contains(currentTask))
        {
            return null;
        }

        string boundTasks = string.Join(", ", taskIds);
        return currentTask is null
            ? $"Data element of type {dataType.Id} can only be modified in {boundTasks} (no current task)"
            : $"Data element of type {dataType.Id} can only be modified in {boundTasks} (current task {currentTask})";
    }
}

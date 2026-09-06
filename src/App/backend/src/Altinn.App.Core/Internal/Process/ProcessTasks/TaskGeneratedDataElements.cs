using Altinn.App.Core.Features;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.Process.ProcessTasks;

/// <summary>
/// Helpers for data elements a task generates for itself (a receipt PDF, a signing PDF), tagged with the task so
/// <c>CleanupGeneratedFromTask</c> removes them when the task is entered again.
/// </summary>
internal static class TaskGeneratedDataElements
{
    /// <summary>
    /// Adds the element, or updates it if one tagged with this task already exists. The update branch
    /// is retry idempotency, not re-entry protection: a re-run of a partially completed transition
    /// (this command succeeded and committed the element, a later command in the transition failed)
    /// finds the earlier attempt's element and overwrites it instead of duplicating it. Stale elements
    /// from previous visits never reach this point - CleanupGeneratedFromTask removes them when the
    /// task is entered.
    /// </summary>
    public static void UpsertBinaryDataElement(
        IInstanceDataMutator dataMutator,
        string dataTypeId,
        string contentType,
        string fileName,
        ReadOnlyMemory<byte> bytes,
        string taskId
    )
    {
        DataElement? existingDataElement = dataMutator.Instance.Data.SingleOrDefault(de =>
            de.DataType == dataTypeId
            && de.References?.Exists(reference =>
                reference.Relation == RelationType.GeneratedFrom
                && reference.ValueType == ReferenceType.Task
                && reference.Value == taskId
            )
                is true
        );

        if (existingDataElement is not null)
        {
            dataMutator.UpdateBinaryDataElement(existingDataElement, contentType, bytes);
            return;
        }

        dataMutator.AddBinaryDataElement(dataTypeId, contentType, fileName, bytes, generatedFromTask: taskId);
    }
}

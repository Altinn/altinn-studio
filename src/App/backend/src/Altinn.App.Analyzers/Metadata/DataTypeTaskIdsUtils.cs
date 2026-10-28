using Altinn.App.Analyzers.Utils;

namespace Altinn.App.Analyzers.Metadata;

/// <summary>
/// Reports the v8 <c>taskId</c> of data types in <c>applicationmetadata.json</c>, which binds nothing in v9.
/// </summary>
internal static class DataTypeTaskIdsUtils
{
    /// <summary>
    /// Appends a diagnostic on every non-empty <c>taskId</c> in the given applicationmetadata.json.
    /// </summary>
    internal static void CollectDiagnostics(AdditionalText text, CancellationToken token, List<Diagnostic> diagnostics)
    {
        // Unreadable files are reported by the FormDataWrapperAnalyzer (ALTINNAPP0002).
        if (MetadataFile.TryRead(text, token) is not { } metadata)
        {
            return;
        }

        foreach (var dataType in metadata.DataTypes.All)
        {
            // An empty taskId binds the data type to no task in v8 too.
            if (dataType.TaskId is not { Value.Length: > 0 } taskId)
            {
                continue;
            }

            diagnostics.Add(
                Diagnostic.Create(
                    dataType.TaskIds is null
                        ? Diagnostics.Deprecations.TaskId
                        : Diagnostics.Deprecations.TaskIdNextToTaskIds,
                    FileLocationHelper.GetLocation(text, taskId.Start, taskId.End),
                    dataType.Id,
                    taskId.Value
                )
            );
        }
    }
}

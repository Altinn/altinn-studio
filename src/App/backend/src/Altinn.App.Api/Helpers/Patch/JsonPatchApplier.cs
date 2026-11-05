using System.Text.Json.Nodes;
using Altinn.App.Api.Models;
using Json.Patch;
using Json.Pointer;

namespace Altinn.App.Api.Helpers.Patch;

/// <summary>
/// Applies a JSON Patch to a JSON document. This is the only place that depends on the patch library, so that the
/// library can change without touching the public models or the controllers.
/// </summary>
internal static class JsonPatchApplier
{
    /// <summary>
    /// Applies <paramref name="operations"/> in order to a copy of <paramref name="document"/>.
    /// </summary>
    /// <returns>
    /// The patched document, or the first operation that failed. A <c>test</c> operation whose target exists but
    /// holds another value is reported as a test failure: the document is not in the state the patch expects.
    /// Any other failure, including a <c>test</c> of a location that does not exist, is an error in the patch.
    /// </returns>
    public static JsonPatchApplyResult Apply(IReadOnlyList<JsonPatchOperation> operations, JsonNode? document)
    {
        var patch = new JsonPatch(operations.Select(ToLibraryOperation));
        var result = patch.Apply(document);
        if (result.IsSuccess)
        {
            return new JsonPatchApplied(result.Result);
        }

        int index = result.Operation;
        var operation = operations[index];
        if (operation.Op is JsonPatchOperationType.Test && TargetExists(operations, index, document))
        {
            return new JsonPatchFailed(
                index,
                operation,
                IsTestFailure: true,
                $"Test operation {index} failed: the value at `{operation.Path}` is not equal to the expected value."
            );
        }

        return new JsonPatchFailed(
            index,
            operation,
            IsTestFailure: false,
            $"Operation {index} ({operation.OpName} `{operation.Path}`) failed: {result.Error}"
        );
    }

    /// <summary>
    /// Whether the target of <paramref name="operations"/>[<paramref name="index"/>] exists in the document as it
    /// is after the operations before it, which all applied. The library does not expose that intermediate
    /// document, so this applies the earlier operations again; it only runs when a patch has already failed.
    /// </summary>
    private static bool TargetExists(IReadOnlyList<JsonPatchOperation> operations, int index, JsonNode? document)
    {
        var documentBefore =
            index == 0
                ? document
                : new JsonPatch(operations.Take(index).Select(ToLibraryOperation)).Apply(document).Result;
        return JsonPointer.Parse(operations[index].Path).TryEvaluate(documentBefore, out _);
    }

    private static PatchOperation ToLibraryOperation(JsonPatchOperation operation) =>
        operation.Op switch
        {
            JsonPatchOperationType.Add => PatchOperation.Add(JsonPointer.Parse(operation.Path), operation.Value),
            JsonPatchOperationType.Remove => PatchOperation.Remove(JsonPointer.Parse(operation.Path)),
            JsonPatchOperationType.Replace => PatchOperation.Replace(
                JsonPointer.Parse(operation.Path),
                operation.Value
            ),
            JsonPatchOperationType.Test => PatchOperation.Test(JsonPointer.Parse(operation.Path), operation.Value),
            _ => throw new InvalidOperationException($"Unknown operation type {operation.Op}"),
        };
}

/// <summary>
/// Every operation applied. <see cref="Document"/> is the patched copy.
/// </summary>
internal sealed record JsonPatchApplied(JsonNode? Document);

/// <summary>
/// An operation failed, and no later operation was applied.
/// </summary>
/// <param name="OperationIndex">Index of the failed operation in the patch.</param>
/// <param name="Operation">The failed operation.</param>
/// <param name="IsTestFailure">
/// The operation was a <c>test</c> of an existing location with another value, so the document did not
/// match what the patch expected. <see langword="false"/> for every other failure.
/// </param>
/// <param name="Message">Describes the failure for the caller of the API.</param>
internal sealed record JsonPatchFailed(
    int OperationIndex,
    JsonPatchOperation Operation,
    bool IsTestFailure,
    string Message
);

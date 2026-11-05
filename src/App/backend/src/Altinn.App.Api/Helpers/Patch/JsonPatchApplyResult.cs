using System.Text.Json.Nodes;
using Altinn.App.Api.Models;

namespace Altinn.App.Api.Helpers.Patch;

// This file is excluded from CSharpier in .csharpierignore, because CSharpier 1.3.0 cannot parse the `union`
// declaration. Keep it formatted by hand, and remove the exclusion when CSharpier supports unions.

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

/// <summary>
/// The outcome of <see cref="JsonPatchApplier.Apply"/>.
/// </summary>
internal union JsonPatchApplyResult(JsonPatchApplied, JsonPatchFailed);

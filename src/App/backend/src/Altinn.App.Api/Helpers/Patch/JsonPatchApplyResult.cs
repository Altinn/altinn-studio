namespace Altinn.App.Api.Helpers.Patch;

// This file holds only the union, because CSharpier 1.3.0 cannot parse a `union` declaration and the file is
// excluded in .csharpierignore. Keep it formatted by hand, and move the union back next to its cases in
// JsonPatchApplier.cs when CSharpier supports unions.

/// <summary>
/// The outcome of <see cref="JsonPatchApplier.Apply"/>.
/// </summary>
internal union JsonPatchApplyResult(JsonPatchApplied, JsonPatchFailed);

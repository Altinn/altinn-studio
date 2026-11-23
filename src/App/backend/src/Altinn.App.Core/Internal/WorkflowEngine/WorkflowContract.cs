using System.Reflection;
using System.Text.Json;
using Altinn.App.Core.Internal.WorkflowEngine.Models;

namespace Altinn.App.Core.Internal.WorkflowEngine;

/// <summary>
/// The version of what one pod of an app hands to another through the workflow engine: the steps a transition plans,
/// each command's key and payload, and the callback state. Every <see cref="SignedWorkflowState"/> names the version
/// of the library that wrote it, and the engine carries the envelope without reading it.
/// </summary>
/// <remarks>
/// A pod never runs a step whose callback state was written under a newer version than its own. It may lack a command,
/// a payload field or a state field, and would fail the workflow permanently or drop the field for the steps after it.
/// The callback controller answers such a step with a status the engine retries, so the step runs once it reaches a
/// pod that reads the version. A step hands on its state under the version of the pod that ran it, so a workflow never
/// returns to a pod older than one that has planned or run a part of it.
/// </remarks>
internal static class WorkflowContract
{
    /// <summary>The JSON name of <see cref="SignedWorkflowState.ContractVersion"/>.</summary>
    public const string VersionProperty = "contractVersion";

    /// <summary>
    /// The version this library writes, and the highest it reads. Raise it in the change that makes the library plan or
    /// write something a pod on the previous version cannot run or would drop: a new command, a changed command
    /// payload, or changed callback state. <c>WorkflowContractTests</c> fails when their shape changes.
    /// </summary>
    public const int Version = 1;

    /// <summary>
    /// This pod's Altinn.App.Core package version without build metadata, such as <c>9.0.0-preview.10</c>, for the
    /// message a refusing pod logs. It is never compared, and never written into an envelope: the engine includes the
    /// state in its fingerprint of an enqueue, so an envelope must not differ between releases under one
    /// <see cref="Version"/>.
    /// </summary>
    public static string LibraryVersion { get; } = ResolveLibraryVersion(typeof(WorkflowContract).Assembly);

    /// <summary>
    /// Whether a signed envelope was written under a version this pod does not read. An envelope without a version,
    /// from before versions existed, is read by every pod. A version that is not a whole number counts as newer: this
    /// library always writes one, so anything else comes from a version it does not know.
    /// </summary>
    /// <param name="envelopeJson">The envelope as the callback carried it. It is not verified first.</param>
    /// <param name="version">The version the envelope names, as written, when the method returns true.</param>
    public static bool IsWrittenUnderNewerVersion(string? envelopeJson, out string? version)
    {
        version = null;
        if (string.IsNullOrEmpty(envelopeJson))
        {
            return false;
        }

        try
        {
            using JsonDocument document = JsonDocument.Parse(envelopeJson);
            JsonElement root = document.RootElement;
            if (
                root.ValueKind != JsonValueKind.Object
                || !root.TryGetProperty(VersionProperty, out JsonElement stamp)
                || stamp.ValueKind == JsonValueKind.Null
                || (stamp.ValueKind == JsonValueKind.Number && stamp.TryGetInt32(out int number) && number <= Version)
            )
            {
                return false;
            }

            version = stamp.GetRawText();
            return true;
        }
        catch (JsonException)
        {
            return false;
        }
    }

    private static string ResolveLibraryVersion(Assembly assembly)
    {
        // src/App/PackageVersioning.props sets the informational version to the package version, followed by the
        // commit as build metadata.
        string? informational = assembly
            .GetCustomAttribute<AssemblyInformationalVersionAttribute>()
            ?.InformationalVersion;
        if (string.IsNullOrWhiteSpace(informational))
        {
            return assembly.GetName().Version?.ToString() ?? "unknown";
        }

        int metadataStart = informational.IndexOf('+', StringComparison.Ordinal);
        return metadataStart < 0 ? informational : informational[..metadataStart];
    }
}

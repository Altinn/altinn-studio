using System.Xml.Linq;
using NanoJsonReader;

namespace Altinn.App.Analyzers.Process;

/// <summary>
/// Checks that a <c>subformPdf</c> service task can be rendered. The backend renders each subform data element at
/// <c>{taskId}/subform/{subformComponentId}/{dataElementId}</c>, where <c>taskId</c> is the service task itself. The
/// frontend looks the component up in the service task's own UI folder, requires it to be a Subform component, and
/// renders the data element with the <c>defaultDataType</c> of the component's <c>layoutSet</c> (see
/// <c>ComponentRouting</c> and <c>SubformWrapper</c> in the app frontend), while the backend picks the data elements
/// by <c>subformDataTypeId</c>. The runtime backstop is <c>SubformPdfServiceTask</c> in Altinn.App.Core.
/// </summary>
internal static class SubformPdfServiceTaskUtils
{
    /// <summary>The component type the frontend can render a subform with, matched like the app backend does.</summary>
    private const string SubformComponentType = "Subform";

    internal static void CollectDiagnostics(
        ServiceTaskElement task,
        IReadOnlyDictionary<string, UiFolder> uiFolders,
        Location location,
        CancellationToken token,
        List<Diagnostic> diagnostics
    )
    {
        var config = task.Extension.Element(PdfServiceTaskUtils.AltinnNamespace + "subformPdfConfig");
        if (config is null)
        {
            Report(Diagnostics.Process.SubformPdfServiceTaskIncomplete, task.Id, "subformPdfConfig");
            return;
        }

        var componentId = ConfigValue(config, "subformComponentId");
        var dataTypeId = ConfigValue(config, "subformDataTypeId");
        if (componentId is null || dataTypeId is null)
        {
            if (componentId is null)
            {
                Report(Diagnostics.Process.SubformPdfServiceTaskIncomplete, task.Id, "subformComponentId");
            }

            if (dataTypeId is null)
            {
                Report(Diagnostics.Process.SubformPdfServiceTaskIncomplete, task.Id, "subformDataTypeId");
            }

            return;
        }

        uiFolders.TryGetValue(task.Id, out var ownFolder);
        if (ownFolder is null)
        {
            ReportComponentNotFound($"there is no UI folder 'ui/{task.Id}'");
            return;
        }

        var component = FindComponent(ownFolder, componentId, token, out var allLayoutsRead);
        if (component is null)
        {
            // A page that cannot be read might hold the component, so it is only reported missing when every page
            // was read.
            if (allLayoutsRead)
            {
                ReportComponentNotFound($"no layout in 'ui/{task.Id}' has a component with that id");
            }

            return;
        }

        if (!string.Equals(component.Type, SubformComponentType, StringComparison.OrdinalIgnoreCase))
        {
            ReportComponentNotFound(
                component.Type is null
                    ? "the component has no type"
                    : $"it is a '{component.Type}' component, not a Subform component"
            );
            return;
        }

        if (component.LayoutSet is not { } layoutSet || string.IsNullOrWhiteSpace(layoutSet))
        {
            ReportComponentNotFound("the Subform component has no layoutSet");
            return;
        }

        uiFolders.TryGetValue(layoutSet, out var subformFolder);
        if (subformFolder is null)
        {
            ReportComponentNotFound($"its layoutSet '{layoutSet}' is not a UI folder");
            return;
        }

        string? subformDataType;
        try
        {
            var subformSettings = PdfServiceTaskUtils.ReadJsonObject(subformFolder.Settings, token);
            if (subformSettings is null)
            {
                return;
            }

            subformDataType = PdfServiceTaskUtils.GetSettingsString(subformSettings, "defaultDataType");
        }
        catch (NanoJsonException)
        {
            return;
        }

        if (string.IsNullOrWhiteSpace(subformDataType))
        {
            ReportComponentNotFound($"its layoutSet '{layoutSet}' has no defaultDataType");
            return;
        }

        if (!string.Equals(subformDataType, dataTypeId, StringComparison.Ordinal))
        {
            Report(
                Diagnostics.Process.SubformPdfServiceTaskDataTypeMismatch,
                task.Id,
                dataTypeId,
                componentId,
                subformDataType,
                layoutSet
            );
        }

        void Report(DiagnosticDescriptor descriptor, params object?[] messageArgs) =>
            diagnostics.Add(Diagnostic.Create(descriptor, location, messageArgs));

        void ReportComponentNotFound(string reason) =>
            Report(Diagnostics.Process.SubformPdfServiceTaskComponentNotFound, task.Id, componentId, reason);
    }

    /// <summary>
    /// A <c>subformPdfConfig</c> value as the runtime reads it, or null when it is missing or blank - which the
    /// runtime rejects.
    /// </summary>
    private static string? ConfigValue(XElement config, string name) =>
        config.Element(PdfServiceTaskUtils.AltinnNamespace + name)?.Value is { } value
        && !string.IsNullOrWhiteSpace(value)
            ? value
            : null;

    /// <summary>
    /// The component with the given id on any of the folder's layout pages. Component ids and properties are read
    /// as written, like the frontend and the app backend do. <paramref name="allLayoutsRead"/> tells whether every
    /// page could be read.
    /// </summary>
    private static LayoutComponent? FindComponent(
        UiFolder folder,
        string componentId,
        CancellationToken token,
        out bool allLayoutsRead
    )
    {
        allLayoutsRead = true;
        foreach (var layoutFile in folder.Layouts)
        {
            try
            {
                var page = PdfServiceTaskUtils.ReadJsonObject(layoutFile, token);
                var data = page?.GetProperty("data");
                var components = data?.Type == JsonType.Object ? data.GetProperty("layout") : null;
                if (components?.Type != JsonType.Array)
                {
                    allLayoutsRead = false;
                    continue;
                }

                foreach (var component in components.GetArrayValues())
                {
                    if (component.Type == JsonType.Object && GetString(component, "id") == componentId)
                    {
                        return new LayoutComponent(GetString(component, "type"), GetString(component, "layoutSet"));
                    }
                }
            }
            catch (NanoJsonException)
            {
                allLayoutsRead = false;
            }
        }

        return null;
    }

    private static string? GetString(JsonValue jsonObject, string propertyName)
    {
        var value = jsonObject.GetProperty(propertyName);
        return value?.Type == JsonType.String ? value.GetString() : null;
    }

    /// <param name="Type">The component's <c>type</c>.</param>
    /// <param name="LayoutSet">The UI folder a Subform component renders its data elements with.</param>
    private sealed record LayoutComponent(string? Type, string? LayoutSet);
}

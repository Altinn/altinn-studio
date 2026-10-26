namespace Altinn.App.Analyzers.Process;

/// <summary>
/// The elements the runtime reads under <c>altinn:taskExtension</c>, all in the <c>http://altinn.no/process</c>
/// namespace: the <c>XmlElement</c> and <c>XmlArray</c> properties of <c>AltinnTaskExtension</c> and the
/// configuration classes it holds, in Altinn.App.Core. The analyzer targets netstandard2.0 and cannot reference
/// Altinn.App.Core, so the names are copied; they are pinned to those classes by <c>TaskConfigurationSchemaTests</c>.
/// </summary>
internal static class TaskConfigurationSchema
{
    internal static readonly TaskConfigElement TaskExtension = Group(
        "taskExtension",
        List("actions", "action"),
        Value("taskType"),
        Group(
            "signatureConfig",
            List("dataTypesToSign", "dataType"),
            Value("signatureDataType"),
            List("uniqueFromSignaturesInDataTypes", "dataType"),
            Value("signeeProviderId"),
            Value("signeeStatesDataTypeId"),
            Value("signingPdfDataType"),
            EnvironmentValues("correspondenceResource"),
            Value("runDefaultValidator")
        ),
        Group("paymentConfig", Value("paymentDataType"), Value("paymentReceiptPdfDataType")),
        Group("pdfConfig", Value("filenameTextResourceKey"), List("autoPdfTaskIds", "taskId")),
        Group(
            "eFormidlingConfig",
            EnvironmentValues("disabled"),
            EnvironmentValues("receiver"),
            EnvironmentValues("process"),
            EnvironmentValues("standard"),
            EnvironmentValues("typeVersion"),
            EnvironmentValues("type"),
            EnvironmentValues("securityLevel"),
            EnvironmentValues("dpfShipmentType"),
            new TaskConfigElement("dataTypes", Repeated: true, HasEnvironment: true, [Values("dataType")])
        ),
        Group(
            "subformPdfConfig",
            Value("filenameTextResourceKey"),
            Value("subformComponentId"),
            Value("subformDataTypeId")
        )
    );

    /// <summary>A single value, of which the runtime reads the first occurrence.</summary>
    private static TaskConfigElement Value(string name) => new(name, Repeated: false, HasEnvironment: false, []);

    /// <summary>A value that may occur many times, each occurrence an entry in a list.</summary>
    private static TaskConfigElement Values(string name) => new(name, Repeated: true, HasEnvironment: false, []);

    /// <summary>A value per environment (<c>AltinnEnvironmentConfig</c>): each occurrence names its own in <c>env</c>.</summary>
    private static TaskConfigElement EnvironmentValues(string name) =>
        new(name, Repeated: true, HasEnvironment: true, []);

    /// <summary>A group of settings, of which the runtime reads the first occurrence.</summary>
    private static TaskConfigElement Group(string name, params TaskConfigElement[] children) =>
        new(name, Repeated: false, HasEnvironment: false, [.. children]);

    /// <summary>
    /// A list (<c>XmlArray</c>) of <paramref name="item"/> entries. The runtime joins the entries of every occurrence of
    /// the list.
    /// </summary>
    private static TaskConfigElement List(string name, string item) =>
        new(name, Repeated: true, HasEnvironment: false, [Values(item)]);
}

/// <summary>An element the runtime reads in a task's configuration.</summary>
/// <param name="Name">The element's local name, which the runtime matches exactly, including case.</param>
/// <param name="Repeated">
/// Whether the runtime reads every occurrence. Otherwise it reads the first and ignores the rest.
/// </param>
/// <param name="HasEnvironment">Whether its <c>env</c> attribute names the environment an occurrence applies in.</param>
/// <param name="Children">The elements the runtime reads inside it; empty for an element that holds a value.</param>
internal sealed record TaskConfigElement(
    string Name,
    bool Repeated,
    bool HasEnvironment,
    ImmutableArray<TaskConfigElement> Children
)
{
    /// <summary>The child with exactly this name, or null.</summary>
    internal TaskConfigElement? Find(string childName) => Children.FirstOrDefault(c => c.Name == childName);
}

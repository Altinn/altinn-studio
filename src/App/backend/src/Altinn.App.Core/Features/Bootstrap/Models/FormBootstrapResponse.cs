using System.Text.Json.Serialization;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Validation;

namespace Altinn.App.Core.Features.Bootstrap.Models;

/// <summary>
/// Response containing all data needed to bootstrap a form.
/// This replaces multiple frontend requests with a single backend response.
/// </summary>
public sealed class FormBootstrapResponse
{
    /// <summary>
    /// Schema version for this response format. Used for frontend compatibility.
    /// </summary>
    [JsonPropertyName("schemaVersion")]
    public int SchemaVersion { get; init; } = 1;

    /// <summary>
    /// Layouts keyed by page name, containing all layout definitions.
    /// </summary>
    [JsonPropertyName("layouts")]
    public required object Layouts { get; init; }

    /// <summary>
    /// Layout settings including page order configuration.
    /// </summary>
    [JsonPropertyName("layoutSettings")]
    public object? LayoutSettings { get; init; }

    /// <summary>
    /// Data models keyed by data type ID.
    /// </summary>
    [JsonPropertyName("dataModels")]
    public required Dictionary<string, DataModelInfo> DataModels { get; init; }

    /// <summary>
    /// Static options (code lists) keyed by optionsId.
    /// Each optionsId can contain multiple static query parameter variants.
    /// </summary>
    [JsonPropertyName("staticOptions")]
    public required Dictionary<string, StaticOptionsInfo> StaticOptions { get; init; }

    /// <summary>
    /// Initial validation issues for instance mode.
    /// Null for stateless mode or PDF generation.
    /// </summary>
    [JsonPropertyName("validationIssues")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public List<ValidationIssueWithSource>? ValidationIssues { get; init; }

    /// <summary>
    /// Metadata about the form bootstrap request.
    /// </summary>
    [JsonPropertyName("metadata")]
    public required FormBootstrapMetadata Metadata { get; init; }
}

/// <summary>
/// Information about a single data model.
/// </summary>
public sealed class DataModelInfo
{
    /// <summary>
    /// JSON schema for this data model.
    /// </summary>
    [JsonPropertyName("schema")]
    public required object Schema { get; init; }

    /// <summary>
    /// Initial form data (deserialized model instance).
    /// </summary>
    [JsonPropertyName("initialData")]
    public required object InitialData { get; init; }

    /// <summary>
    /// Data element ID in storage. Null for stateless mode.
    /// </summary>
    [JsonPropertyName("dataElementId")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? DataElementId { get; init; }

    /// <summary>
    /// Whether the data element is writable (not locked).
    /// </summary>
    [JsonPropertyName("isWritable")]
    public required bool IsWritable { get; init; }

    /// <summary>
    /// Expression validation configuration. Null for PDF mode or locked data.
    /// </summary>
    [JsonPropertyName("expressionValidationConfig")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public object? ExpressionValidationConfig { get; init; }

    /// <summary>
    /// Initial validation issues scoped to this data model/data element.
    /// Null for stateless mode or PDF generation.
    /// </summary>
    [JsonPropertyName("initialValidationIssues")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public List<ValidationIssueWithSource>? InitialValidationIssues { get; set; }
}

/// <summary>
/// Static options metadata for a single optionsId.
/// </summary>
public sealed class StaticOptionsInfo
{
    /// <summary>
    /// Static options variants for this optionsId.
    /// </summary>
    [JsonPropertyName("variants")]
    public required List<StaticOptionsVariant> Variants { get; init; }
}

/// <summary>
/// A static options variant keyed by resolved static query parameters.
/// </summary>
public sealed class StaticOptionsVariant
{
    /// <summary>
    /// Static query parameters for this variant.
    /// </summary>
    [JsonPropertyName("queryParameters")]
    public required Dictionary<string, string> QueryParameters { get; init; }

    /// <summary>
    /// Options for this variant.
    /// </summary>
    [JsonPropertyName("options")]
    public required List<AppOption> Options { get; init; }
}

/// <summary>
/// Metadata about the form bootstrap response.
/// </summary>
public sealed class FormBootstrapMetadata
{
    /// <summary>
    /// The layout set ID being used.
    /// </summary>
    [JsonPropertyName("layoutSetId")]
    public required string LayoutSetId { get; init; }

    /// <summary>
    /// The default data type for this layout set.
    /// </summary>
    [JsonPropertyName("defaultDataType")]
    public required string DefaultDataType { get; init; }

    /// <summary>
    /// Whether this is a subform (nested form data).
    /// </summary>
    [JsonPropertyName("isSubform")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public bool IsSubform { get; init; }

    /// <summary>
    /// Whether this is for PDF generation (skip certain validations).
    /// </summary>
    [JsonPropertyName("isPdf")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public bool IsPdf { get; init; }
}

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
    /// Layouts keyed by page name, containing all layout definitions.
    /// </summary>
    [JsonPropertyName("layouts")]
    public required object Layouts { get; init; }

    /// <summary>
    /// Data models keyed by data type ID.
    /// </summary>
    [JsonPropertyName("dataModels")]
    public required Dictionary<string, DataModelInfo> DataModels { get; init; }

    /// <summary>
    /// Static options (code lists) keyed by optionsId.
    /// </summary>
    [JsonPropertyName("staticOptions")]
    public required Dictionary<string, StaticOptionSet> StaticOptions { get; init; }

    /// <summary>
    /// Initial validation issues for instance mode.
    /// Null for stateless mode or PDF generation.
    /// </summary>
    [JsonPropertyName("validationIssues")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public List<ValidationIssueWithSource>? ValidationIssues { get; init; }
}

/// <summary>
/// Static options payload for a single optionsId.
/// </summary>
public sealed class StaticOptionSet
{
    /// <summary>
    /// Option list payload.
    /// </summary>
    [JsonPropertyName("options")]
    public required List<AppOption> Options { get; init; }

    /// <summary>
    /// Downstream parameters encoded as key=value pairs separated by comma.
    /// </summary>
    [JsonPropertyName("downstreamParameters")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? DownstreamParameters { get; init; }
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

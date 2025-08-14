using System.Text.Json.Serialization;
using Newtonsoft.Json;

namespace Altinn.App.Core.Models.Validation;

/// <summary>
/// Represents a detailed message from validation.
/// </summary>
public class ValidationIssue
{
    /// <summary>
    /// The seriousness of the identified issue.
    /// </summary>
    /// <remarks>
    /// This property is serialized in json as a number
    /// 1: Error (something needs to be fixed)
    /// 2: Warning (does not prevent submission)
    /// 3: Information (hint shown to the user)
    /// 4: Fixed (obsolete, only used for v3 of frontend)
    /// 5: Success (Inform the user that something was completed with success)
    /// </remarks>
    [JsonProperty(PropertyName = "severity")]
    [JsonPropertyName("severity")]
    [System.Text.Json.Serialization.JsonConverter(typeof(JsonNumberEnumConverter<ValidationIssueSeverity>))]
    public required ValidationIssueSeverity Severity { get; set; }

    /// <summary>
    /// The unique id of the specific element with the identified issue.
    /// </summary>
    [System.Text.Json.Serialization.JsonIgnore]
    [Newtonsoft.Json.JsonIgnore]
    [Obsolete("Not in use", error: true)]
    public string? InstanceId { get; set; }

    /// <summary>
    /// The unique id of the data element of a given instance with the identified issue.
    /// </summary>
    [JsonProperty(PropertyName = "dataElementId")]
    [JsonPropertyName("dataElementId")]
    public string? DataElementId { get; set; }

    /// <summary>
    /// A reference to a property the issue is about.
    /// </summary>
    [JsonProperty(PropertyName = "field")]
    [JsonPropertyName("field")]
    public string? Field { get; set; }

    /// <summary>
    /// A system readable identification of the type of issue.
    /// Eg:
    /// </summary>
    [JsonProperty(PropertyName = "code")]
    [JsonPropertyName("code")]
    // TODO: Make this required for v9
    public string? Code { get; set; }

    /// <summary>
    /// A human readable description of the issue.
    /// </summary>
    [JsonProperty(PropertyName = "description")]
    [JsonPropertyName("description")]
    // TODO: Make this required for v9
    public string? Description { get; set; }

    /// <summary>
    /// The short name of the class that crated the message (set automatically after return of list)
    /// </summary>
    [JsonProperty(PropertyName = "source")]
    [JsonPropertyName("source")]
    [Obsolete("Source is set automatically by the validation service. Setting it explicitly will be an error in v9")]
    public string? Source { get; set; }

    /// <summary>
    /// The custom text key to use for the localized text in the frontend.
    /// </summary>
    [JsonProperty(PropertyName = "customTextKey")]
    [JsonPropertyName("customTextKey")]
    public string? CustomTextKey { get; set; }

    /// <summary>
    /// <see cref="CustomTextKey"/> might include some parameters (typically the field value, or some derived value)
    /// that should be included in error message.
    /// </summary>
    /// <example>
    /// The localized text for the key might be "Date must be between {0} and {1}"
    /// and the param will provide the dynamical range of allowable dates (eg the reporting period)
    /// </example>
    [Obsolete("Use customTextParameters instead")]
    [JsonProperty(PropertyName = "customTextParams")]
    [JsonPropertyName("customTextParams")]
    public List<string>? CustomTextParams { get; set; }

    /// <summary>
    /// <see cref="CustomTextKey"/> might include some parameters (typically the field value, or some derived value)
    /// that should be included in error message.
    /// </summary>
    /// <example>
    /// The localized text for the key might be "Date must be between {0} and {1}"
    /// and the param will provide the dynamical range of allowable dates (eg the reporting period)
    /// </example>
    [JsonProperty(PropertyName = "customTextParameters")]
    [JsonPropertyName("customTextParameters")]
    public Dictionary<string, string>? CustomTextParameters { get; set; }
}

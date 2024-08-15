using System.Text.Json.Serialization;

namespace Altinn.App.Core.Models.Validation;

/// <summary>
/// Represents a detailed message from validation.
/// </summary>
public class ValidationIssueWithSource
{
    /// <summary>
    /// Converter function to create a <see cref="ValidationIssueWithSource"/> from a <see cref="ValidationIssue"/> and adding a source.
    /// </summary>
    public static ValidationIssueWithSource FromIssue(ValidationIssue issue, string source)
    {
        return new ValidationIssueWithSource
        {
            Severity = issue.Severity,
            DataElementId = issue.DataElementId,
            Field = issue.Field,
            Code = issue.Code,
            Description = issue.Description,
            Source = source,
            CustomTextKey = issue.CustomTextKey,
            CustomTextParams = issue.CustomTextParams,
        };
    }

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
    [JsonPropertyName("severity")]
    [JsonConverter(typeof(JsonNumberEnumConverter<ValidationIssueSeverity>))]
    public required ValidationIssueSeverity Severity { get; set; }

    /// <summary>
    /// The unique id of the data element of a given instance with the identified issue.
    /// </summary>
    [JsonPropertyName("dataElementId")]
    public string? DataElementId { get; set; }

    /// <summary>
    /// A reference to a property the issue is about.
    /// </summary>
    [JsonPropertyName("field")]
    public string? Field { get; set; }

    /// <summary>
    /// A system readable identification of the type of issue.
    /// Eg:
    /// </summary>
    [JsonPropertyName("code")]
    public required string? Code { get; set; }

    /// <summary>
    /// A human readable description of the issue.
    /// </summary>
    [JsonPropertyName("description")]
    public required string? Description { get; set; }

    /// <summary>
    /// The short name of the class that crated the message (set automatically after return of list)
    /// </summary>
    [JsonPropertyName("source")]
    public required string Source { get; set; }

    /// <summary>
    /// The custom text key to use for the localized text in the frontend.
    /// </summary>
    [JsonPropertyName("customTextKey")]
    public string? CustomTextKey { get; set; }

    /// <summary>
    /// <see cref="CustomTextKey"/> might include some parameters (typically the field value, or some derived value)
    /// that should be included in error message.
    /// </summary>
    /// <example>
    /// The localized text for the key might be "Date must be between {0} and {1}"
    /// and the param will provide the dynamical range of allowable dates (eg teh reporting period)
    /// </example>
    [JsonPropertyName("customTextParams")]
    public List<string>? CustomTextParams { get; set; }
}

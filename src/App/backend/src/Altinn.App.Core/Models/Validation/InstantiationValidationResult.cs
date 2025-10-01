using Altinn.Platform.Register.Models;

namespace Altinn.App.Core.Models.Validation;

/// <summary>
/// A status returned when validating instantiation
/// </summary>
public class InstantiationValidationResult
{
    /// <summary>
    /// Gets or sets if the validation was valid
    /// </summary>
    public bool Valid { get; set; }

    /// <summary>
    /// Text key to used for translation if Message is null, can be used by frontend directly
    /// </summary>
    public string? CustomTextKey { get; set; }

    /// <summary>
    /// <see cref="CustomTextKey"/> might include some parameters (typically the field value, or some derived value)
    /// that should be included in error message.
    /// </summary>
    /// <example>
    /// The localized text for the key might be "Date must be between {0} and {1}"
    /// and the param will provide the dynamical range of allowable dates (eg the reporting period)
    /// </example>
    public Dictionary<string, string>? CustomTextParameters { get; set; }

#nullable disable
    /// <summary>
    /// Gets or sets a message
    /// </summary>
    public string Message { get; set; }

    /// <summary>
    /// Gets or sets a list of parties the user represents that can instantiate
    /// </summary>
    public List<Party> ValidParties { get; set; }
#nullable restore
}

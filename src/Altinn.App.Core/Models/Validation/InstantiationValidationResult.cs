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

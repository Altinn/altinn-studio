namespace Altinn.App.Core.Models.Validation;

/// <summary>
/// Specifies the severity of a validation issue
/// </summary>
public enum ValidationIssueSeverity
{
    /// <summary>
    /// Severity has not been determined.
    /// </summary>
    Unspecified = 0,

    /// <summary>
    /// The issue requires attention and must be corrected in order to continue
    /// </summary>
    Error = 1,

    /// <summary>
    /// The issue should be corrected, but the process might continue without.
    /// </summary>
    Warning = 2,

    /// <summary>
    /// Immediate feedback provided through validation.
    /// </summary>
    Informational = 3,

    /// <summary>
    /// The issue has been corrected.
    /// </summary>
    [Obsolete("We run all validations from frontend version 4, so we don't need info about fixed issues")]
    Fixed = 4,

    /// <summary>
    /// This validation indicates a success. Used for informational purposes.
    /// </summary>
    Success = 5,
}

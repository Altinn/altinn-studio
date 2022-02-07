namespace Altinn.App.Services.Models.Validation
{
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
        Fixed = 4,
    }
}

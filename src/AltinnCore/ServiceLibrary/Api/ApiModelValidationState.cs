
namespace AltinnCore.ServiceLibrary.Api
{
    /// <summary>
    /// Defines the ValidationState
    /// </summary>
    public enum ApiModelValidationState
    {
        /// <summary>
        /// The field is not validated
        /// </summary>
        Unvalidated = 0,

        /// <summary>
        /// The field is Invalid
        /// </summary>
        Invalid = 1,

        /// <summary>
        /// The field is Valid
        /// </summary>
        Valid = 2,

        /// <summary>
        /// The field is skipped
        /// </summary>
        Skipped = 3
    }
}

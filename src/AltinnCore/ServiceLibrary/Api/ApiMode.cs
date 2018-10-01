
namespace AltinnCore.ServiceLibrary.Api
{
    /// <summary>
    /// Defines the mode for a REST submit of data
    /// </summary>
    public enum ApiMode
    {
        /// <summary>
        /// Create Instance
        /// </summary>
        Create = 0,

        /// <summary>
        /// Create Instance and submit/sign it
        /// </summary>
        Complete = 1,

        /// <summary>
        /// Calculate form and return the calculated form
        /// </summary>
        Calculate = 2,

        /// <summary>
        /// Validate form and return the result
        /// </summary>
        Validate = 3,

        /// <summary>
        /// Update the form data
        /// </summary>
        Update = 4,

        /// <summary>
        /// Read the form data
        /// </summary>
        Read = 5
    }
}

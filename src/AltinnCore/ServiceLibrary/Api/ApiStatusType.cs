
namespace AltinnCore.ServiceLibrary.Api
{
    /// <summary>
    /// Defines the overall Api status
    /// </summary>
    public enum ApiStatusType
    {
        /// <summary>
        /// It is ok
        /// </summary>
        Ok = 0,

        /// <summary>
        /// It contains error
        /// </summary>
        ContainsError = 1,

        /// <summary>
        /// It contains warnings
        /// </summary>
        ContainsWarnings = 2,

        /// <summary>
        /// The data has been calculated
        /// </summary>
        Calculated = 3,

        /// <summary>
        /// The data has been rejected
        /// </summary>
        Rejected = 4
    }
}

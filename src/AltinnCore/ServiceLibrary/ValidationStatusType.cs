namespace AltinnCore.ServiceLibrary
{
    /// <summary>
    /// Enumeration for the available validation statuses
    /// </summary>
    public enum ValidationStatusType
    {
        /// <summary>
        /// Validation status not set (default)
        /// </summary>
        NotSet = 0,

        /// <summary>
        /// Valid validation
        /// </summary>
        Valid = 1,

        /// <summary>
        /// Valid with warning
        /// </summary>
        Warning = 2,
        
        /// <summary>
        /// Error during validation
        /// </summary>
        Error = 3,

        /// <summary>
        /// Undefined
        /// </summary>
        Undefined = 4,
    }
}

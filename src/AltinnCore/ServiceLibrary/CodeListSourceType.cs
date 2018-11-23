namespace AltinnCore.ServiceLibrary
{
    /// <summary>
    /// Enumeration for the different source types for code lists
    /// </summary>
    public enum CodeListSourceType
    {
        /// <summary>
        /// The default value
        /// </summary>
        Unspecified = 0,

        /// <summary>
        /// Indicates that the code list source is a service
        /// </summary>
        Service = 1,

        /// <summary>
        /// Indicates that the code list source is a service owner
        /// </summary>
        Owner = 2,

        /// <summary>
        /// Indicates that the code list source is the platform
        /// </summary>
        Platform = 3,
    }
}

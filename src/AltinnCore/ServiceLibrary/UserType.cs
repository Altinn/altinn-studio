namespace AltinnCore.ServiceLibrary
{
    /// <summary>
    /// Enumeration for the available user types
    /// </summary>
    public enum UserType
    {
        /// <summary>
        /// User identified with social security number
        /// </summary>
        Identified = 0,

        /// <summary>
        /// Self identified user
        /// </summary>
        SelfIdentified = 1,

        /// <summary>
        /// Enterprise identified user
        /// </summary>
        EnterpriseIdentified = 2,

        /// <summary>
        /// Anonymous user
        /// </summary>
        Anonymous = 3,
    }
}

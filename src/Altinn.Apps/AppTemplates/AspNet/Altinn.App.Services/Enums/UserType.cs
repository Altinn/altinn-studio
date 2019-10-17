namespace Altinn.App.Services.Enums
{
    /// <summary>
    /// Enumeration for the available user types
    /// </summary>
    public enum UserType : int
    {
        /// <summary>
        /// User type has not been specified
        /// </summary>
        None = 0,

        /// <summary>
        /// User Type is SSN Identified User.
        /// </summary>
        SSNIdentified = 1,

        /// <summary>
        /// User Type is Self Identified User.
        /// </summary>
        SelfIdentified = 2,

        /// <summary>
        /// User Type is EnterpriseIdentified Identified User.
        /// </summary>
        EnterpriseIdentified = 3,

        /// <summary>
        /// User Type is Agency User
        /// </summary>
        AgencyUser = 4,

        /// <summary>
        /// User Type is PSAN User
        /// </summary>
        PSAN = 5,

        /// <summary>
        /// User Type is PSA User
        /// </summary>
        PSA = 6
    }
}

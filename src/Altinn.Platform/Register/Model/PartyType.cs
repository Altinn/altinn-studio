namespace Altinn.Platform.Register.Model
{
    /// <summary>
    ///  Party Type is used to specify which type of person is reporting.
    /// </summary>
    public enum PartyType : int
    {
        /// <summary>
        /// None has been specified
        /// </summary>
        None = 0,

        /// <summary>
        /// Party Type is Person
        /// </summary>
        Person = 1,

        /// <summary>
        /// Party Type is Organization
        /// </summary>
        Organization = 2,

        /// <summary>
        /// Party Type is Self Identified user
        /// </summary>
        SelfIdentified = 3
    }
}

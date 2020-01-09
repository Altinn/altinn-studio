namespace Altinn.Platform.Register.Enums
{
    /// <summary>
    /// Enum containing values for the different types of parties
    /// </summary>
    public enum PartyType
    {
        /// <summary>
        /// Party Type is Person
        /// </summary>
        Person = 1,

        /// <summary>
        /// Party Type is Organization
        /// </summary>
        Organisation = 2,

        /// <summary>
        /// Party Type is Self Identified user
        /// </summary>
        SelfIdentified = 3,

        /// <summary>
        /// Party Type is sub unit
        /// </summary>
        SubUnit = 4,

        /// <summary>
        /// Party Type is bankruptcy estate
        /// </summary>
        BankruptcyEstate = 5
    }
}

namespace AltinnCore.ServiceLibrary
{
    /// <summary>
    /// Class representing a party
    /// </summary>
    public class Party
    {
        /// <summary>
        /// Gets or sets the ID of the party
        /// </summary>
        public int PartyId { get; set; }

        /// <summary>
        /// Gets or sets the type of party
        /// </summary>
        public PartyType PartyTypeName { get; set; }

        /// <summary>
        /// Gets the parties org number
        /// </summary>
        public string OrgNumber { get; set; }

        /// <summary>
        /// Gets the parties ssn
        /// </summary>
        public string SSN { get; set; }

        /// <summary>
        /// Gets or sets the person details for this party (will only be set if the party type is Person)
        /// </summary>
        public Person Person { get; set; }

        /// <summary>
        /// Gets or sets the organization details for this party (will only be set if the party type is Organization)
        /// </summary>
        public Organization Organization { get; set; }
    }
}

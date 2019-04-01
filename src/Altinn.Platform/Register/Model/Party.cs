namespace Altinn.Platform.Register.Model
{
    /// <summary>
    /// Entity representing a Party
    /// </summary>
    public class Party
    {
        /// <summary>
        /// Gets the party type
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
        /// Gets the parties person, is null if party is a person
        /// </summary>
        public Person Person { get; set; }

        /// <summary>
        /// Gets the parties organization, is null if party is a person
        /// </summary>
        public Organization Organization { get; set; }
    }
}

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
        public PartyType PartyType { get; set; }
        
        /// <summary>
        /// Gets or sets the person details for this party (will only be set if the party type is Person)
        /// </summary>
        public Person Person { get; set; }

        /// <summary>
        /// Gets or sets the organization details for this party (will only be set if the party type is Organization)
        /// </summary>
        public Organization Organization { get; set; }

        /// <summary>
        /// Gets or sets the name of the current reportee
        /// </summary>
        public string ReporteeName { get; set; }

        /// <summary>
        /// The post adress
        /// </summary>
        public Adress PostAdress { get; set; }
    }
}

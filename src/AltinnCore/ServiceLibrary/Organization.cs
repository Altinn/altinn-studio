namespace AltinnCore.ServiceLibrary
{
    /// <summary>
    /// Class representing an organization
    /// </summary>
    public class Organization
    {
        /// <summary>
        /// Gets or sets the ID of the organization
        /// </summary>
        public int OrganizationID { get; set; }

        /// <summary>
        /// Gets or sets the name of the organization
        /// </summary>
        public string OrganizationName { get; set; }

        /// <summary>
        /// Gets or sets the organization number for the organization
        /// </summary>
        public string OrganizationNumber { get; set; }
    }
}

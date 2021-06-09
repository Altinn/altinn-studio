namespace Altinn.Platform.Register.Models
{
    /// <summary>
    /// Class representing an organization
    /// </summary>
    public class Organization
    {
        /// <summary>
        /// Gets or sets the organization number
        /// </summary>
        public string OrgNumber { get; set; }

        /// <summary>
        /// Gets or sets the name of the organization
        /// </summary>
        public string Name { get; set; }

        /// <summary>
        /// Gets or sets the unit type
        /// </summary>
        public string UnitType { get; set; }

        /// <summary>
        /// Gets or sets the telephone number
        /// </summary>
        public string TelephoneNumber { get; set; }

        /// <summary>
        /// Gets or sets the mobile number
        /// </summary>
        public string MobileNumber { get; set; }

        /// <summary>
        /// Gets or sets the fax number
        /// </summary>
        public string FaxNumber { get; set; }

        /// <summary>
        /// Gets or sets the eMail address
        /// </summary>
        public string EMailAddress { get; set; }

        /// <summary>
        /// Gets or sets the internet address
        /// </summary>
        public string InternetAddress { get; set; }

        /// <summary>
        /// Gets or sets the mailing address
        /// </summary>
        public string MailingAddress { get; set; }

        /// <summary>
        /// Gets or sets the mailing postal code 
        /// </summary>
        public string MailingPostalCode { get; set; }

        /// <summary>
        /// Gets or sets the mailing postal city 
        /// </summary>
        public string MailingPostalCity { get; set; }

        /// <summary>
        /// Gets or sets the business address
        /// </summary>
        public string BusinessAddress { get; set; }

        /// <summary>
        /// Gets or sets the postal code business
        /// </summary>
        public string BusinessPostalCode { get; set; }

        /// <summary>
        /// Gets or sets the postal city business
        /// </summary>
        public string BusinessPostalCity { get; set; }

        /// <summary>
        /// Gets or sets the unit status
        /// </summary>
        public string UnitStatus { get; set; }
    }
}

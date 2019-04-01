namespace Altinn.Platform.Register.Model
{
    /// <summary>
    /// Entity representing an Organization
    /// </summary>
    public class Organization
    {
        /// <summary>
        /// Gets Organization Number
        /// </summary>
        public string OrgNumber { get; set; }

        /// <summary>
        /// Gets Name
        /// </summary>
        public string Name { get; set; }

        /// <summary>
        /// Gets Unit Type
        /// </summary>
        public string UnitType { get; set; }

        /// <summary>
        /// Gets Telephone Number
        /// </summary>
        public string TelephoneNumber { get; set; }

        /// <summary>
        /// Gets Mobile Number
        /// </summary>
        public string MobileNumber { get; set; }

        /// <summary>
        /// Gets Fax Number
        /// </summary>
        public string FaxNumber { get; set; }

        /// <summary>
        /// Gets EMail Address
        /// </summary>
        public string EMailAddress { get; set; }

        /// <summary>
        /// Gets Internet Address
        /// </summary>
        public string InternetAddress { get; set; }

        /// <summary>
        /// Gets Mailing Address
        /// </summary>
        public string MailingAddress { get; set; }

        /// <summary>
        /// Gets Mailing Postal Code 
        /// </summary>
        public string MailingPostalCode { get; set; }

        /// <summary>
        /// Gets Mailing Postal City 
        /// </summary>
        public string MailingPostalCity { get; set; }

        /// <summary>
        /// Gets Business Address
        /// </summary>
        public string BusinessAddress { get; set; }

        /// <summary>
        /// Gets Postal Code Business
        /// </summary>
        public string BusinessPostalCode { get; set; }

        /// <summary>
        /// Gets Postal City Business
        /// </summary>
        public string BusinessPostalCity { get; set; }
    }
}

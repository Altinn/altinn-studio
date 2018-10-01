namespace AltinnCore.ServiceLibrary
{
    /// <summary>
    /// Class representing a person
    /// </summary>
    public class Person
    {
        /// <summary>
        /// Gets or sets the ID of the person
        /// </summary>
        public int PersonId { get; set; }
        
        /// <summary>
        /// Gets or sets the social security number
        /// </summary>
        public string SSN { get; set; }

        /// <summary>
        /// Gets or sets the first name
        /// </summary>
        public string FirstName { get; set; }

        /// <summary>
        /// Gets or sets the middle name
        /// </summary>
        public string MiddleName { get; set; }

        /// <summary>
        /// Gets or sets the last name
        /// </summary>
        public string LastName { get; set; }
    }
}

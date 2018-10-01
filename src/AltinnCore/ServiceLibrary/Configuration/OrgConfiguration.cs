namespace AltinnCore.ServiceLibrary.Configuration
{
    /// <summary>
    /// Class containing basic details about a service owner
    /// </summary>
    public class OrgConfiguration
    {
        /// <summary>
        /// Gets or sets the name of the service owner
        /// </summary>
        public string Name { get; set; }

        /// <summary>
        /// Gets or sets the service owner short name (code)
        /// </summary>
        public string Code { get; set; }
    }
}

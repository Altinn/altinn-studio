namespace Altinn.Authorization.ABAC.Xacml.JsonProfile
{
    /// <summary>
    /// A JSON object for policy refernces.
    /// </summary>
    public class XacmlJsonIdReference
    {
        /// <summary>
        /// Gets or sets a string containing a XACML policy or policy set URI.
        /// Represents the value stored inside the XACML XML<PolicyIdReference /> or<PolicySetIdReference/> element.
        /// </summary>
        public string Id { get; set; }

        /// <summary>
        /// Gets or sets the version.
        /// </summary>
        public string Version { get; set; }
    }
}

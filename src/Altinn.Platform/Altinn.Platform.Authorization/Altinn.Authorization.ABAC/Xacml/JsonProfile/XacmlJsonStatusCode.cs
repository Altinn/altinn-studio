namespace Altinn.Authorization.ABAC.Xacml.JsonProfile
{
    /// <summary>
    /// A XACML Json object for status Code.
    /// </summary>
    public class XacmlJsonStatusCode
    {
        /// <summary>
        /// Gets or sets the value.
        /// </summary>
        public string Value { get; set; }

        /// <summary>
        /// Gets or sets a nested status code.
        /// </summary>
        public XacmlJsonStatusCode StatusCode { get; set; }
    }
}

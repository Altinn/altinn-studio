namespace Altinn.Authorization.ABAC.Xacml.JsonProfile
{
    /// <summary>
    /// The JSON object root needed to be able to parse the request.
    /// </summary>
    public class XacmlJsonRequestRoot
    {
        /// <summary>
        /// Gets or sets the request.
        /// </summary>
        public XacmlJsonRequest Request { get; set; }
    }
}

using System.Collections.Generic;

namespace Altinn.Authorization.ABAC.Xacml.JsonProfile
{
    /// <summary>
    /// A JSON object that defines references to multiple requests.
    /// </summary>
    public class XacmlJsonMultiRequests
    {
        /// <summary>
        /// Gets or sets the request reference.
        /// </summary>
        public List<XacmlJsonRequestReference> RequestReference { get; set; }
    }
}

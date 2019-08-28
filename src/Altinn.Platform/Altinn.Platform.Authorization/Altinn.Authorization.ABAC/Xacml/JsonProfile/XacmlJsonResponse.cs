using System.Collections.Generic;

namespace Altinn.Authorization.ABAC.Xacml.JsonProfile
{
    /// <summary>
    /// The JSON Response.
    /// </summary>
    public class XacmlJsonResponse
    {
        /// <summary>
        /// Gets or sets a list over JSON XACML results.
        /// </summary>
        public List<XacmlJsonResult> Response { get; set; }
    }
}

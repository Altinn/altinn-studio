using System.Collections.Generic;

namespace Altinn.Authorization.ABAC.Xacml.JsonProfile
{
    /// <summary>
    /// XACML Json object for status.
    /// </summary>
    public class XacmlJsonStatus
    {
        /// <summary>
        /// Gets or sets the status message.
        /// </summary>
        public string StatusMessage { get; set; }

        /// <summary>
        ///  Gets or sets list over status details.
        /// </summary>
        public List<string> StatusDetails { get; set; }

        /// <summary>
        /// Gets or sets the defined status code.
        /// </summary>
        public XacmlJsonStatusCode StatusCode { get; set; }
    }
}

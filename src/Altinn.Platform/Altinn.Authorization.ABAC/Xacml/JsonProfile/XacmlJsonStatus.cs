using System.Collections.Generic;

namespace Altinn.Authorization.ABAC.Xacml.JsonProfile
{
    /// <summary>
    /// XACML Json object for status
    /// </summary>
    public class XacmlJsonStatus
    {
        /// <summary>
        /// The status message
        /// </summary>
        public string StatusMessage { get; set; }

        /// <summary>
        ///  List over status details
        /// </summary>
        public List<string> StatusDetails { get; set; }

        /// <summary>
        /// The defined status code
        /// </summary>
        public XacmlJsonStatusCode StatusCode { get; set; }
    }
}

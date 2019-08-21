using System;
using System.Collections.Generic;
using System.Text;

namespace Altinn.Authorization.ABAC.Xacml.JsonProfile
{
    /// <summary>
    /// The JSON Response
    /// </summary>
    public class XacmlJsonResponse
    {
        /// <summary>
        /// A list over JSON XACML results
        /// </summary>
        public List<XacmlJsonResult> Response { get; set; }
    }
}

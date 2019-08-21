using System;
using System.Collections.Generic;
using System.Text;

namespace Altinn.Authorization.ABAC.Xacml.JsonProfile
{
    /// <summary>
    /// A JSON object that defines references to multiple requests
    /// </summary>
    public class XacmlJsonMultiRequests
    {
        /// <summary>
        /// The request reference
        /// </summary>
        public List<XacmlJsonRequestReference> RequestReference { get; set; }
    }
}

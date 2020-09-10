using System;
using System.Collections.Generic;
using System.Text;

namespace Altinn.Authorization.ABAC.Xacml.JsonProfile
{
    /// <summary>
    /// Defines a list of json request
    /// </summary>
    public class XacmlJsonRequests
    {
        /// <summary>
        /// A list of requests
        /// </summary>
        public List<XacmlJsonRequest> Requests { get; set; }
    }
}

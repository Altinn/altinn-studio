using System;
using System.Collections.Generic;
using System.Text;

namespace Altinn.Authorization.ABAC.Xacml.JsonProfile
{
    /// <summary>
    /// The JSON object roor needed to be abe to parse the request
    /// </summary>
    public class XacmlJsonRequestRoot
    {
        /// <summary>
        /// The request
        /// </summary>
        public XacmlJsonRequest Request { get; set; }
    }
}

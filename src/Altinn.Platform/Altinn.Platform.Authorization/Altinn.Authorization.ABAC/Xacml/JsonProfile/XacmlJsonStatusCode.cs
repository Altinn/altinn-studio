using System;
using System.Collections.Generic;
using System.Text;

namespace Altinn.Authorization.ABAC.Xacml.JsonProfile
{
    /// <summary>
    /// A XACML Json object for status Code
    /// </summary>
    public class XacmlJsonStatusCode
    {
        /// <summary>
        /// The value
        /// </summary>
        public string Value { get; set; }

        /// <summary>
        /// A nested status code
        /// </summary>
        public XacmlJsonStatusCode StatusCode { get; set; }
    }
}

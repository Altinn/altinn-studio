using System;
using System.Collections.Generic;
using System.Text;

namespace Altinn.Authorization.ABAC.Xacml.JsonProfile
{
    /// <summary>
    /// A JSON object for information about missing attributes in the Context Request
    /// </summary>
    public class XacmlJsonMissingAttributeDetail
    {
        /// <summary>
        /// A string containing a XACML attribute URI
        /// </summary>
        public string AttributeId { get; set; }

        /// <summary>
        /// The value
        /// </summary>
        public List<string> Value { get; set; }

        /// <summary>
        /// The issuer
        /// </summary>
        public string Issuer { get; set; }

        /// <summary>
        /// The datatype
        /// </summary>
        public string DataType { get; set; }

        /// <summary>
        ///  The category of the missing attribute
        /// </summary>
        public string Category { get; set; }
    }
}

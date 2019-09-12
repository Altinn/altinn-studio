using System.Collections.Generic;

namespace Altinn.Authorization.ABAC.Xacml.JsonProfile
{
    /// <summary>
    /// A JSON object for information about missing attributes in the Context Request.
    /// </summary>
    public class XacmlJsonMissingAttributeDetail
    {
        /// <summary>
        /// Gets or sets a string containing a XACML attribute URI.
        /// </summary>
        public string AttributeId { get; set; }

        /// <summary>
        /// Gets or sets the value.
        /// </summary>
        public List<string> Value { get; set; }

        /// <summary>
        /// Gets or sets the issuer.
        /// </summary>
        public string Issuer { get; set; }

        /// <summary>
        /// Gets or sets the datatype.
        /// </summary>
        public string DataType { get; set; }

        /// <summary>
        ///  Gets or sets the category of the missing attribute.
        /// </summary>
        public string Category { get; set; }
    }
}

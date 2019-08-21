using System;
using System.Collections.Generic;
using System.Text;

namespace Altinn.Authorization.ABAC.Xacml.JsonProfile
{
    /// <summary>
    /// Defines the Attribute Json object
    /// </summary>
    public class XacmlJsonAttribute
    {
        /// <summary>
        /// The AttributeId. Required
        /// </summary>
        public string AttributeId { get; set; }

        /// <summary>
        /// The value for the Attribute. Required
        /// </summary>
        public string Value { get; set; }

        /// <summary>
        /// The issuer of the attribute. Optional
        /// </summary>
        public string Issuer { get; set; }

        /// <summary>
        /// The datatype of the attribute. Optional in somce cases.
        /// </summary>
        public string DataType { get; set; }

        /// <summary>
        /// Defines if the attribute should be returned in the result. 
        /// </summary>
        public bool IncludeInResult { get; set; }
    }
}

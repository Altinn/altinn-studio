using System.Collections.Generic;

namespace Altinn.Authorization.ABAC.Xacml.JsonProfile
{
    /// <summary>
    /// Defines a Json object for Obl
    /// </summary>
    public class XacmlJsonObligationOrAdvice
    {
        /// <summary>
        /// A string containing a XACML obligation or advice URI
        /// </summary>
        public string Id { get; set; }

        /// <summary>
        /// An array of AttributeAssignment objects
        /// </summary>
        public List<XacmlJsonAttributeAssignment> AttributeAssignment { get; set; }
    }
}

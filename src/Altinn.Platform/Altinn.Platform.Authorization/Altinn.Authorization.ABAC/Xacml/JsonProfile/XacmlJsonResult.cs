using System.Collections.Generic;

namespace Altinn.Authorization.ABAC.Xacml.JsonProfile
{
    /// <summary>
    /// The JSON object Result
    /// </summary>
    public class XacmlJsonResult
    {
        /// <summary>
        /// The XACML Decision
        /// </summary>
        public string Decision { get; set; }

        /// <summary>
        /// The status
        /// </summary>
        public XacmlJsonStatus Status { get; set;  }

        /// <summary>
        /// Any obligations of the result
        /// </summary>
        public List<XacmlJsonObligationOrAdvice> Obligations { get; set; }

        /// <summary>
        /// XACML Advice
        /// </summary>
        public List<XacmlJsonObligationOrAdvice> AssociateAdvice { get; set; }

        /// <summary>
        /// Category
        /// </summary>
        public List<XacmlJsonCategory> Category { get; set;  }

        /// <summary>
        /// Policy Identifyer list related to the result
        /// </summary>
        public XacmlJsonPolicyIdentifierList PolicyIdentifierList { get; set; }
    }
}

using System.Collections.Generic;

namespace Altinn.Authorization.ABAC.Xacml.JsonProfile
{
    /// <summary>
    /// The JSON object Result.
    /// </summary>
    public class XacmlJsonResult
    {
        /// <summary>
        /// Gets or sets the XACML Decision.
        /// </summary>
        public string Decision { get; set; }

        /// <summary>
        /// Gets or sets the status.
        /// </summary>
        public XacmlJsonStatus Status { get; set;  }

        /// <summary>
        /// Gets or sets any obligations of the result.
        /// </summary>
        public List<XacmlJsonObligationOrAdvice> Obligations { get; set; }

        /// <summary>
        /// Gets or sets xACML Advice.
        /// </summary>
        public List<XacmlJsonObligationOrAdvice> AssociateAdvice { get; set; }

        /// <summary>
        /// Gets or sets category.
        /// </summary>
        public List<XacmlJsonCategory> Category { get; set;  }

        /// <summary>
        /// Gets or sets policy Identifyer list related to the result.
        /// </summary>
        public XacmlJsonPolicyIdentifierList PolicyIdentifierList { get; set; }
    }
}

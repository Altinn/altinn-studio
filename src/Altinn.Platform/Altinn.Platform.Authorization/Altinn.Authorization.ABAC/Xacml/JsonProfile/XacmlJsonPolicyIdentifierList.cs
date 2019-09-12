using System.Collections.Generic;

namespace Altinn.Authorization.ABAC.Xacml.JsonProfile
{
    /// <summary>
    /// A JSON object that refernces a policy or policy set.
    /// </summary>
    public class XacmlJsonPolicyIdentifierList
    {
        /// <summary>
        /// Gets or sets list over policy id references.
        /// </summary>
        public List<XacmlJsonIdReference> PolicyIdReference { get; set; }

        /// <summary>
        /// Gets or sets list policy sets references.
        /// </summary>
        public List<XacmlJsonIdReference> PolicySetIdReference { get; set; }
    }
}

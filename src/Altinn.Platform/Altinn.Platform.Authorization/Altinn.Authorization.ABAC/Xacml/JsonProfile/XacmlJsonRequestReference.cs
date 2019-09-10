using System.Collections.Generic;

namespace Altinn.Authorization.ABAC.Xacml.JsonProfile
{
    /// <summary>
    /// JSON object for request references.
    /// </summary>
    public class XacmlJsonRequestReference
    {
        /// <summary>
        /// Gets or sets the reference Id.
        /// </summary>
        public List<string> ReferenceId { get; set; }
    }
}

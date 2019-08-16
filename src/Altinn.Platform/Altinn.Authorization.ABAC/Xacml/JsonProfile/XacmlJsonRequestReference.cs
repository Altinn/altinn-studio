using System;
using System.Collections.Generic;
using System.Text;

namespace Altinn.Authorization.ABAC.Xacml.JsonProfile
{
    /// <summary>
    /// JSON object for request references
    /// </summary>
    public class XacmlJsonRequestReference
    {
        /// <summary>
        /// The reference Id
        /// </summary>
        public List<string> ReferenceId { get; set; }
    }
}

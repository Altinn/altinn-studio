using System.Collections.Generic;

namespace Altinn.Common.PEP.Models
{
    public class EnforcementResult
    {
        /// <summary>
        /// Value indicating whether enforcement result shows authorized or not
        /// </summary>
        public bool Authorized { get; set; }

        /// <summary>
        /// Collection of obligations that did not pass validation
        /// </summary>
        public Dictionary<string, string> FailedObligations { get; set; }
    }
}

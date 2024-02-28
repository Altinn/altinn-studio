using System.Collections.Generic;
using Altinn.ResourceRegistry.Core.Models;

namespace Altinn.Studio.Designer.Models
{
    /// <summary>
    /// Defines a list of orgs
    /// </summary>
    public class OrgList
    {
        /// <summary>
        /// Dictionary of orgs
        /// </summary>
        public Dictionary<string, Org> Orgs { get; set; }
    }
}

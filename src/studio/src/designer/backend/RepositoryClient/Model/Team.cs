using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Altinn.Studio.Designer.RepositoryClient.Model
{
    /// <summary>
    /// A team
    /// </summary>
    public class Team
    {
        /// <summary>
        /// The name of the team
        /// </summary>
        public string Name { get; set; }

        /// <summary>
        /// The organization that owns the team
        /// </summary>
        public Organization Organization { get; set; }
    }
}

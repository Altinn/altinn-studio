using System;
using System.Collections.Generic;
using System.Text;

namespace AltinnCore.Common.Models
{
    /// <summary>
    /// This class define the Repository status
    /// </summary>
    public class RepoStatus
    {
        /// <summary>
        /// The number of commits behind the 
        /// </summary>
        public int? BehindBy { get; set; }

        /// <summary>
        /// The number of commits before the remote
        /// </summary>
        public int? AheadBy { get; set; }

        /// <summary>
        /// List over files that has changed
        /// </summary>
        public List<RepositoryContent> ContentStatus { get; set; }
    }
}

using System.Collections.Generic;
using Altinn.Studio.Designer.Enums;
using Newtonsoft.Json;
using Newtonsoft.Json.Converters;

namespace Altinn.Studio.Designer.Models
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

        /// <summary>
        /// Defines the status of the repository
        /// </summary>
        [JsonConverter(typeof(StringEnumConverter))]
        public RepositoryStatus RepositoryStatus { get; set; }

        /// <summary>
        /// Defines if there is any merge conflicts
        /// </summary>
        public bool HasMergeConflict { get; set;  }
    }
}

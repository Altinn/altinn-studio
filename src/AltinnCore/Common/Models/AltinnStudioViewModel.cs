using AltinnCore.RepositoryClient.Model;
using AltinnCore.ServiceLibrary.Configuration;
using AltinnCore.ServiceLibrary.ServiceMetadata;
using System;
using System.Collections.Generic;
using System.Text;

namespace AltinnCore.Common.Models
{
    public class AltinnStudioViewModel
    {

        /// <summary>
        /// 
        /// </summary>
        public string Org { get; set; }

        /// <summary>
        /// 
        /// </summary>
        public string Service { get; set; }

        /// <summary>
        /// Repostory Content
        /// </summary>
        public List<RepositoryContent> RepositoryContent { get; set; }

        public bool IsLocalRepo { get; set; }

        public bool MissingAppToken { get; set; }

        public ServiceConfiguration ServiceConfiguration { get; set; }

        public Dictionary<string, string> Codelists { get; set; }

        public CommitInfo CommitInfo { get; set; }

        public int? CommitsBehind { get; set; }
        public List<Repository> Repositories { get; set; }

        public RepositorySearch RepositorySearch { get; set; }

        public ServiceMetadata ServiceMetadata { get; set; }
    }
}

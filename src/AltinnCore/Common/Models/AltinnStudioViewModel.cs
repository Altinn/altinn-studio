using System;
using System.Collections.Generic;
using System.Text;
using AltinnCore.RepositoryClient.Model;
using AltinnCore.ServiceLibrary.Configuration;
using AltinnCore.ServiceLibrary.ServiceMetadata;

namespace AltinnCore.Common.Models
{
    /// <summary>
    /// view model for the altinn studio
    /// </summary>
    public class AltinnStudioViewModel
    {
        /// <summary>
        /// Gets or sets the organisation
        /// </summary>
        public string Org { get; set; }

        /// <summary>
        /// Gets or sets the app
        /// </summary>
        public string Service { get; set; }

        /// <summary>
        /// Repostory Content
        /// </summary>
        public List<RepositoryContent> RepositoryContent { get; set; }

        /// <summary>
        /// Gets or sets whether the repository is local
        /// </summary>
        public bool IsLocalRepo { get; set; }

        /// <summary>
        /// Gets or sets whether the app token is missing
        /// </summary>
        public bool MissingAppToken { get; set; }

        /// <summary>
        /// Gets or sets Service configuration
        /// </summary>
        public ServiceConfiguration ServiceConfiguration { get; set; }

        /// <summary>
        /// Gets or sets code list
        /// </summary>
        public Dictionary<string, string> Codelists { get; set; }

        /// <summary>
        /// Gets or sets commit information of the repository
        /// </summary>
        public CommitInfo CommitInfo { get; set; }

        /// <summary>
        /// Gets or sets information about number of commits that the repository is behind master
        /// </summary>
        public int? CommitsBehind { get; set; }

        /// <summary>
        /// Gets or sets repository list
        /// </summary>
        public List<Repository> Repositories { get; set; }

        /// <summary>
        /// Gets or sets parametes to search for repository
        /// </summary>
        public RepositorySearch RepositorySearch { get; set; }

        /// <summary>
        /// Gets or sets service meta data for the application
        /// </summary>
        public ServiceMetadata ServiceMetadata { get; set; }
    }
}

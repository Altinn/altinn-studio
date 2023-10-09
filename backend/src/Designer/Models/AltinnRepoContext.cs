using System;
using System.Text.RegularExpressions;
using Altinn.Studio.Designer.Helpers;

namespace Altinn.Studio.Designer.Models
{
    /// <summary>
    /// Class representing context of an Altinn repository.
    /// This class in part of internal domain model and should not be exposed to the outside world.
    /// </summary>
    public class AltinnRepoContext
    {
        /// <summary>
        /// The organization owning the repository identfied by it's short name as defined in Gitea.
        /// </summary>
        public string Org { get; }

        /// <summary>
        /// The name of the repository as specified in Gitea.
        /// </summary>
        public string Repo { get; }

        protected AltinnRepoContext(string org, string repo)
        {
            ValidateOrganization(org);
            Guard.AssertValidAppRepoName(repo);
            Org = org;
            Repo = repo;
        }

        private void ValidateOrganization(string org)
        {
            Guard.AssertNotNullOrEmpty(org, nameof(org));
            if (!Regex.IsMatch(org, "^[a-zA-Z0-9][a-zA-Z0-9-_\\.]*$"))
            {
                throw new ArgumentException("Provided organization name is not valid");
            }
        }
    }
}

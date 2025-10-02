using Altinn.Studio.Designer.Helpers;

namespace Altinn.Studio.Designer.Models
{
    /// <summary>
    /// Class representing context of an Altinn repository.
    /// This class in part of internal domain model and should not be exposed to the outside world.
    /// </summary>
    public record AltinnRepoContext
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
            Guard.AssertValidateOrganization(org);
            Guard.AssertValidAppRepoName(repo);
            Org = org;
            Repo = repo;
        }

        public static AltinnRepoContext FromOrgRepo(string org, string repo)
        {
            return new AltinnRepoContext(org, repo);
        }
    }
}

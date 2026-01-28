using Altinn.Studio.Designer.Helpers;

namespace Altinn.Studio.Designer.Models
{
    /// <summary>
    /// A context class representing an authenticated Altinn repository editing session.
    /// This includes the developer's access token for Git operations.
    /// This class is part of internal domain model and should not be exposed to the outside world.
    /// </summary>
    public record AltinnAuthenticatedRepoEditingContext : AltinnRepoEditingContext
    {
        /// <summary>
        /// The developer's access token for Git operations.
        /// </summary>
        public string DeveloperAppToken { get; }

        public AltinnRepoEditingContext RepoEditingContext => FromOrgRepoDeveloper(Org, Repo, Developer);

        public AltinnOrgEditingContext OrgEditingContext => AltinnOrgEditingContext.FromOrgDeveloper(Org, Developer);

        private AltinnAuthenticatedRepoEditingContext(string org, string repo, string developer, string developerAppToken)
            : base(org, repo, developer)
        {
            Guard.AssertNotNullOrEmpty(developerAppToken, nameof(developerAppToken));
            DeveloperAppToken = developerAppToken;
        }

        public static AltinnAuthenticatedRepoEditingContext FromOrgRepoDeveloperToken(string org, string repo, string developer, string developerAppToken)
        {
            return new AltinnAuthenticatedRepoEditingContext(org, repo, developer, developerAppToken);
        }

        /// <summary>
        /// Creates an authenticated context from an existing editing context and token.
        /// </summary>
        public static AltinnAuthenticatedRepoEditingContext FromEditingContext(AltinnRepoEditingContext editingContext, string developerAppToken)
        {
            return new AltinnAuthenticatedRepoEditingContext(
                editingContext.Org,
                editingContext.Repo,
                editingContext.Developer,
                developerAppToken);
        }
    }
}

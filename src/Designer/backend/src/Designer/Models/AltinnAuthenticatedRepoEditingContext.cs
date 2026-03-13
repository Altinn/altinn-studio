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

        /// <summary>
        /// When true, git operations authenticate exclusively via the token (Basic Auth)
        /// and no reverse-proxy identity headers (X-WEBAUTH-USER) are sent.
        /// This is required for system/bot operations (e.g. gitops) where the token belongs
        /// to a service account, not the logged-in user. Without this flag the proxy would
        /// forward the current user's identity headers, causing Gitea to authenticate as
        /// the user instead of the bot — silently failing pushes to repos the user cannot access.
        /// </summary>
        public bool MustUseTokenAuth { get; }

        public AltinnRepoEditingContext RepoEditingContext => FromOrgRepoDeveloper(Org, Repo, Developer);

        public AltinnOrgEditingContext OrgEditingContext => AltinnOrgEditingContext.FromOrgDeveloper(Org, Developer);

        private AltinnAuthenticatedRepoEditingContext(
            string org,
            string repo,
            string developer,
            string developerAppToken,
            bool mustUseTokenAuth = false
        )
            : base(org, repo, developer)
        {
            Guard.AssertNotNullOrEmpty(developerAppToken, nameof(developerAppToken));
            DeveloperAppToken = developerAppToken;
            MustUseTokenAuth = mustUseTokenAuth;
        }

        public static AltinnAuthenticatedRepoEditingContext FromOrgRepoDeveloperToken(
            string org,
            string repo,
            string developer,
            string developerAppToken,
            bool mustUseTokenAuth = false
        )
        {
            return new AltinnAuthenticatedRepoEditingContext(org, repo, developer, developerAppToken, mustUseTokenAuth);
        }

        /// <summary>
        /// Creates an authenticated context from an existing editing context and token.
        /// </summary>
        public static AltinnAuthenticatedRepoEditingContext FromEditingContext(
            AltinnRepoEditingContext editingContext,
            string developerAppToken
        )
        {
            return new AltinnAuthenticatedRepoEditingContext(
                editingContext.Org,
                editingContext.Repo,
                editingContext.Developer,
                developerAppToken
            );
        }
    }
}

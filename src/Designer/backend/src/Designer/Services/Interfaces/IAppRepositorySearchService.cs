using System.Threading.Tasks;
using Altinn.Studio.Designer.RepositoryClient.Model;

namespace Altinn.Studio.Designer.Services.Interfaces;

/// <summary>
/// Searches the repositories that hold apps, leaving out the repositories an owner shares across its apps.
/// </summary>
public interface IAppRepositorySearchService
{
    /// <summary>
    /// Returns a page of the repositories that match the search, without the shared repositories. The page keeps
    /// Gitea's page boundaries and page count, so a page that held a shared repository has fewer repositories,
    /// and the total count leaves out every shared repository the search would have returned.
    /// </summary>
    /// <param name="searchOptions">The search, which must not have a keyword.</param>
    /// <returns>The page, or null when Gitea fails to answer.</returns>
    Task<SearchResults?> SearchApps(SearchOptions searchOptions);
}

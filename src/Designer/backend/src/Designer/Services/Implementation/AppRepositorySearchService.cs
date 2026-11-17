using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Clients.Interfaces;
using Altinn.Studio.Designer.Enums;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.RepositoryClient.Model;
using Altinn.Studio.Designer.Services.Interfaces;
using RepositoryModel = Altinn.Studio.Designer.RepositoryClient.Model.Repository;

namespace Altinn.Studio.Designer.Services.Implementation;

/// <summary>
/// Gitea's search can't leave repositories out, so this removes the shared repositories from Gitea's page and
/// counts them with a second search to correct the total.
/// </summary>
public class AppRepositorySearchService(IGiteaClient giteaClient) : IAppRepositorySearchService
{
    // The largest page Studio's Gitea returns.
    private const int SharedRepositorySearchPageSize = 100;

    /// <inheritdoc />
    public async Task<SearchResults?> SearchApps(SearchOptions searchOptions)
    {
        Task<SearchResults> pageSearch = giteaClient.SearchRepo(searchOptions);
        Task<int?> sharedRepositoryCount = CountSharedRepositories(searchOptions.UId);

        SearchResults page = await pageSearch;
        int? sharedRepositories = await sharedRepositoryCount;
        if (page is null || sharedRepositories is null)
        {
            return null;
        }

        page.Data = page.Data.Where(IsApp).ToList();
        page.TotalCount -= sharedRepositories.Value;
        return page;
    }

    private async Task<int?> CountSharedRepositories(int ownerId)
    {
        // Gitea matches each comma-separated term anywhere in a name or topic, so only full names count.
        SearchResults firstPage = await giteaClient.SearchRepo(SharedRepositorySearch(ownerId, 1));
        if (firstPage is null)
        {
            return null;
        }

        List<SearchResults> pages = [firstPage];
        if (firstPage.TotalPages > 1)
        {
            pages.AddRange(
                await Task.WhenAll(
                    Enumerable
                        .Range(2, firstPage.TotalPages - 1)
                        .Select(page => giteaClient.SearchRepo(SharedRepositorySearch(ownerId, page)))
                )
            );
        }

        if (pages.Any(page => page is null))
        {
            return null;
        }

        return pages.Sum(page => page.Data.Count(repository => !IsApp(repository)));
    }

    private static SearchOptions SharedRepositorySearch(int ownerId, int page) =>
        new()
        {
            Keyword = string.Join(',', RepositoryNames.SharedRepositorySuffixes),
            UId = ownerId,
            Page = page,
            Limit = SharedRepositorySearchPageSize,
        };

    private static bool IsApp(RepositoryModel repository) =>
        RepositoryNames.KindOf(repository.Owner.Login, repository.Name) == RepositoryKind.App;
}

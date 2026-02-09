using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Constants;
using Altinn.Studio.Designer.Models.Dto;

namespace Altinn.Studio.Designer.Services.Interfaces.Organisation;

public interface IOrgLibraryService
{

    /// <summary>
    /// Gets the latest commit sha for a given branch.
    /// </summary>
    /// <param name="org">Organisation.</param>
    /// <param name="branchName">The branch name. Fallback to default branch.</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
    /// <returns>The latest commit sha.</returns>
    Task<string> GetLatestCommitOnBranch(string org, string branchName = General.DefaultBranch, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets all files from a given preset path.
    /// </summary>
    /// <param name="org">Organisation.</param>
    /// <param name="path">Path to a folder.</param>
    /// <param name="reference">Resource reference, commit/branch/tag, usually default branch if empty.</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
    /// <returns>The shared resources from mentioned path.</returns>
    Task<GetSharedResourcesResponse> GetSharedResourcesByPath(string org, string? path = null, string? reference = null, CancellationToken cancellationToken = default);

    /// <summary>
    /// Update all files from the request.
    /// </summary>
    /// <param name="org">Organisation.</param>
    /// <param name="developer">Developer.</param>
    /// <param name="token">The developer token.</param>
    /// <param name="request">The request.</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
    Task UpdateSharedResourcesByPath(string org, string developer, string token, UpdateSharedResourceRequest request, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets all the published library elements for the organisation.
    /// </summary>
    /// <param name="org">Organisation.</param>
    /// <param name="path">Path to a folder.</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
    /// <returns>The published library elements from mentioned path.</returns>
    Task<List<string>> GetPublishedResourcesForOrg(string org, string path, CancellationToken cancellationToken = default);
}

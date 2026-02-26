using Altinn.App.Core.Models;

namespace Altinn.App.Core.Features.Options.Altinn3LibraryCodeList;

/// <summary>
/// Service for handling Altinn 3 library code lists.
/// </summary>
public interface IAltinn3LibraryCodeListService
{
    /// <summary>
    /// Gets code list from cache or Altinn3 library and maps the response to AppOptions.
    /// </summary>
    /// <param name="org">Organization that created the code list</param>
    /// <param name="codeListId">Code list id</param>
    /// <param name="version">Code list version</param>
    /// <param name="language">Preferred language to map to. Has fallback, will try to map to requested language, else Nb, En, then first available (alphabetically by key) if not provided or not found.</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>App options</returns>
    Task<AppOptions> GetAppOptionsAsync(
        string org,
        string codeListId,
        string version,
        string? language,
        CancellationToken cancellationToken
    );

    /// <summary>
    /// Gets code list from cache or Altinn3 library.
    /// </summary>
    /// <param name="org">Organization that created the code list</param>
    /// <param name="codeListId">Code list id</param>
    /// <param name="version">Code list version</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Altinn 3 library code list response</returns>
    Task<Altinn3LibraryCodeListResponse> GetCachedCodeListResponseAsync(
        string org,
        string codeListId,
        string? version,
        CancellationToken cancellationToken
    );

    /// <summary>
    /// Maps Altinn3 library code list response to AppOptions
    /// </summary>
    /// <param name="libraryCodeListResponse">Code list input</param>
    /// <param name="language">Preferred language to map to. Has fallback, will try to map to requested language, else Nb, En, then first available (alphabetically by key) if not provided or not found.</param>
    /// <returns>App options</returns>
    AppOptions MapAppOptions(Altinn3LibraryCodeListResponse libraryCodeListResponse, string? language);
}

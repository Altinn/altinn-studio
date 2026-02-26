namespace Altinn.App.Core.Features.Options.Altinn3LibraryCodeList;

/// <summary>
/// Interface for the Altinn 3 library code list API client
/// </summary>
internal interface IAltinn3LibraryCodeListApiClient
{
    /// <summary>
    /// Get Altinn 3 library code lists
    /// </summary>
    /// <param name="org">Organization that created the code list</param>
    /// <param name="codeListId">Code list id</param>
    /// <param name="version">Code list version</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Altinn 3 library code list response</returns>
    Task<Altinn3LibraryCodeListResponse> GetAltinn3LibraryCodeList(
        string org,
        string codeListId,
        string version,
        CancellationToken cancellationToken = default
    );
}

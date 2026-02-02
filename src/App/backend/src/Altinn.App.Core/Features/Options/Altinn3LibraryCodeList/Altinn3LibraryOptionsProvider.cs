using Altinn.App.Core.Models;

namespace Altinn.App.Core.Features.Options.Altinn3LibraryCodeList;

internal sealed class Altinn3LibraryOptionsProvider : IAppOptionsProvider
{
    private readonly IAltinn3LibraryCodeListService _altinn3LibraryCodeListService;

    public Altinn3LibraryOptionsProvider(
        string optionId,
        string org,
        string codeListId,
        string? version,
        IAltinn3LibraryCodeListService altinn3LibraryCodeListService
    )
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(optionId);
        ArgumentException.ThrowIfNullOrWhiteSpace(org);
        ArgumentException.ThrowIfNullOrWhiteSpace(codeListId);
        ArgumentNullException.ThrowIfNull(altinn3LibraryCodeListService);

        Id = optionId;
        _org = org;
        _codeListId = codeListId;
        _version = version;
        _altinn3LibraryCodeListService = altinn3LibraryCodeListService;
    }

    public string Id { get; }
    private readonly string _org;
    private readonly string _codeListId;
    private readonly string? _version;

    /// <summary>
    /// Gets the <see cref="AppOptions"/> based on the provided options id and key value pairs.
    /// </summary>
    /// <param name="language">Language code</param>
    /// <param name="keyValuePairs">Altinn 3 library code lists doesnt support key/value pairs to control what options to get, so this is unused here.</param>
    /// <returns>A <see cref="Task{TResult}"/> representing the result of the asynchronous operation.</returns>
    public async Task<AppOptions> GetAppOptionsAsync(string? language, Dictionary<string, string> keyValuePairs)
    {
        var result = await _altinn3LibraryCodeListService.GetCachedCodeListResponseAsync(
            _org,
            _codeListId,
            _version,
            CancellationToken.None
        );
        return _altinn3LibraryCodeListService.MapAppOptions(result, language);
    }
}

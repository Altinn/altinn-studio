using System.Text.Json;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Models;

namespace Altinn.App.Core.Features.Options;

/// <inheritdoc/>
internal sealed class AppOptionsFileHandler : IAppOptionsFileHandler
{
    private static readonly JsonSerializerOptions _jsonSerializerOptions = new(JsonSerializerDefaults.Web)
    {
        ReadCommentHandling = JsonCommentHandling.Skip,
        AllowTrailingCommas = true,
    };

    private readonly AppFilesAccessor _appFiles;

    /// <summary>
    /// Initializes a new instance of the <see cref="AppOptionsFileHandler"/> class.
    /// </summary>
    public AppOptionsFileHandler(AppFilesAccessor appFiles)
    {
        _appFiles = appFiles;
    }

    /// <inheritdoc/>
    public Task<List<AppOption>?> ReadOptionsFromFileAsync(string optionId)
    {
        if (_appFiles.Current.GetOptions(optionId) is not { } bytes)
        {
            return Task.FromResult<List<AppOption>?>(null);
        }

        return Task.FromResult(JsonSerializer.Deserialize<List<AppOption>>(bytes.Span, _jsonSerializerOptions));
    }
}

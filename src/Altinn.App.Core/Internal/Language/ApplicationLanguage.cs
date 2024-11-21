using System.Text.Json;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Implementation;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Altinn.App.Core.Internal.Language;

/// <summary>
/// An implementation used to retrieve the supported application languages.
/// </summary>
public class ApplicationLanguage : IApplicationLanguage
{
    private static readonly JsonSerializerOptions _jsonSerializerOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    private readonly AppSettings _settings;
    private readonly ILogger _logger;
    private readonly Telemetry? _telemetry;

    /// <summary>
    /// Initializes a new instance of the <see cref="ApplicationLanguage"/> class.
    /// </summary>
    /// <param name="settings">The app repository settings.</param>
    /// <param name="logger">A logger from the built in logger factory.</param>
    /// <param name="telemetry">Telemetry for traces and metrics.</param>
    public ApplicationLanguage(
        IOptions<AppSettings> settings,
        ILogger<AppResourcesSI> logger,
        Telemetry? telemetry = null
    )
    {
        _settings = settings.Value;
        _logger = logger;
        _telemetry = telemetry;
    }

    /// <inheritdoc />
    public async Task<List<Models.ApplicationLanguage>> GetApplicationLanguages()
    {
        using var activity = _telemetry?.StartGetApplicationLanguageActivity();
        var pathTextsResourceFolder = Path.Join(
            _settings.AppBasePath,
            _settings.ConfigurationFolder,
            _settings.TextFolder
        );
        var directoryInfo = new DirectoryInfo(pathTextsResourceFolder);
        var textResourceFilesInDirectory = directoryInfo.GetFiles();
        var applicationLanguages = new List<Models.ApplicationLanguage>();

        foreach (var fileInfo in textResourceFilesInDirectory)
        {
            await using (FileStream fileStream = new(fileInfo.FullName, FileMode.Open, FileAccess.Read))
            {
                // ! TODO: find a better way to deal with deserialization errors here, rather than adding nulls to the list
                // ! JSON deserialization returns null if the input is literally "null"
                var applicationLanguage = (
                    await JsonSerializer.DeserializeAsync<Models.ApplicationLanguage>(
                        fileStream,
                        _jsonSerializerOptions
                    )
                )!;
                applicationLanguages.Add(applicationLanguage);
            }
        }

        return applicationLanguages;
    }
}

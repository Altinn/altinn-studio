using System.Text.Json;
using System.Text.RegularExpressions;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
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

    private static readonly Regex _fileNameRegex = new(
        @"^resource\.[a-z]{2}\.json$",
        RegexOptions.Compiled,
        TimeSpan.FromMilliseconds(10)
    );

    private readonly AppSettings _settings;
    private readonly Telemetry? _telemetry;

    /// <summary>
    /// Initializes a new instance of the <see cref="ApplicationLanguage"/> class.
    /// </summary>
    /// <param name="settings">The app repository settings.</param>
    /// <param name="telemetry">Telemetry for traces and metrics.</param>
    public ApplicationLanguage(IOptions<AppSettings> settings, Telemetry? telemetry = null)
    {
        _settings = settings.Value;
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
            if (!_fileNameRegex.IsMatch(fileInfo.Name))
            {
                continue;
            }

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

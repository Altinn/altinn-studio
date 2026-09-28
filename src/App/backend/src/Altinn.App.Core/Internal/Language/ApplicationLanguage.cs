using System.Text.Json;
using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.App;

namespace Altinn.App.Core.Internal.Language;

/// <summary>
/// An implementation used to retrieve the supported application languages.
/// </summary>
internal sealed class ApplicationLanguage : IApplicationLanguage
{
    private static readonly JsonSerializerOptions _jsonSerializerOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    private readonly AppFilesAccessor _appFiles;
    private readonly Telemetry? _telemetry;

    /// <summary>
    /// Initializes a new instance of the <see cref="ApplicationLanguage"/> class.
    /// </summary>
    /// <param name="appFiles">The app resource files.</param>
    /// <param name="telemetry">Telemetry for traces and metrics.</param>
    public ApplicationLanguage(AppFilesAccessor appFiles, Telemetry? telemetry = null)
    {
        _appFiles = appFiles;
        _telemetry = telemetry;
    }

    /// <inheritdoc />
    public Task<List<Models.ApplicationLanguage>> GetApplicationLanguages()
    {
        using var activity = _telemetry?.StartGetApplicationLanguageActivity();
        var applicationLanguages = new List<Models.ApplicationLanguage>();
        AppFiles files = _appFiles.Current;
        foreach (var language in files.GetTextResourceLanguages())
        {
            // Only resource.{xx}.json files count, as before the files were served from memory
            if (language.Length != 2 || !char.IsAsciiLetterLower(language[0]) || !char.IsAsciiLetterLower(language[1]))
            {
                continue;
            }

            if (files.GetTextResource(language) is not { } bytes)
            {
                continue;
            }

            // ! TODO: find a better way to deal with deserialization errors here, rather than adding nulls to the list
            // ! JSON deserialization returns null if the input is literally "null"
            var applicationLanguage = JsonSerializer.Deserialize<Models.ApplicationLanguage>(
                bytes.Span,
                _jsonSerializerOptions
            )!;
            applicationLanguages.Add(applicationLanguage);
        }

        return Task.FromResult(applicationLanguages);
    }
}

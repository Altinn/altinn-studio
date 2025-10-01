using System.Text;
using System.Text.Json;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Models;
using Microsoft.Extensions.Options;

namespace Altinn.App.Core.Features.Options;

/// <inheritdoc/>
public class AppOptionsFileHandler : IAppOptionsFileHandler
{
    private static readonly JsonSerializerOptions _jsonSerializerOptions = new(JsonSerializerDefaults.Web)
    {
        ReadCommentHandling = JsonCommentHandling.Skip,
        AllowTrailingCommas = true,
    };

    private readonly AppSettings _settings;

    /// <summary>
    /// Initializes a new instance of the <see cref="AppOptionsFileHandler"/> class.
    /// </summary>
    public AppOptionsFileHandler(IOptions<AppSettings> settings)
    {
        _settings = settings.Value;
    }

    /// <inheritdoc/>
    public async Task<List<AppOption>?> ReadOptionsFromFileAsync(string optionId)
    {
        string legalPath = Path.Join(_settings.AppBasePath, _settings.OptionsFolder);
        string filename = legalPath + optionId + ".json";
        PathHelper.EnsureLegalPath(legalPath, filename);

        if (File.Exists(filename))
        {
            string fileData = await File.ReadAllTextAsync(filename, Encoding.UTF8);
            List<AppOption>? options = JsonSerializer.Deserialize<List<AppOption>>(fileData, _jsonSerializerOptions);
            return options;
        }

        return null;
    }
}

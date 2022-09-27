using System.Text.Json;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Implementation;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Altinn.App.Core.Internal.Language
{
    /// <summary>
    /// An implementation used to retrieve the supported application languages.
    /// </summary>
    public class ApplicationLanguage : IApplicationLanguage
    {
        private readonly AppSettings _settings;
        private readonly ILogger _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="ApplicationLanguage"/> class.
        /// </summary>
        /// <param name="settings">The app repository settings.</param>
        /// <param name="logger">A logger from the built in logger factory.</param>
        public ApplicationLanguage(
            IOptions<AppSettings> settings,
            ILogger<AppResourcesSI> logger)
        {
            _settings = settings.Value;
            _logger = logger;
        }

        /// <inheritdoc />
        public async Task<List<Models.ApplicationLanguage>> GetApplicationLanguages()
        {
            var pathTextsResourceFolder = Path.Join(_settings.AppBasePath, _settings.ConfigurationFolder, _settings.TextFolder);
            var directoryInfo = new DirectoryInfo(pathTextsResourceFolder);
            var textResourceFilesInDirectory = directoryInfo.GetFiles();
            var applicationLanguages = new List<Models.ApplicationLanguage>();

            foreach (var fileInfo in textResourceFilesInDirectory)
            {
                Models.ApplicationLanguage applicationLanguage;
                await using (FileStream fileStream = new(fileInfo.FullName, FileMode.Open, FileAccess.Read))
                {
                    JsonSerializerOptions options = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
                    applicationLanguage = await JsonSerializer.DeserializeAsync<Models.ApplicationLanguage>(fileStream, options);
                }

                applicationLanguages.Add(applicationLanguage);
            }

            return applicationLanguages;
        }
    }
}

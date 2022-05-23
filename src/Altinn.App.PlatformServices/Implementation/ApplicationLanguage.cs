using System.Collections.Generic;
using System.IO;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.App.PlatformServices.Interface;
using Altinn.App.Services.Configuration;
using Altinn.App.Services.Implementation;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Altinn.App.PlatformServices.Implementation
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
        public async Task<List<Common.Models.ApplicationLanguage>> GetApplicationLanguages()
        {
            var pathTextsResourceFolder = Path.Join(_settings.AppBasePath, _settings.ConfigurationFolder, _settings.TextFolder);
            var directoryInfo = new DirectoryInfo(pathTextsResourceFolder);
            var textResourceFilesInDirectory = directoryInfo.GetFiles();
            var applicationLanguages = new List<Common.Models.ApplicationLanguage>();

            foreach (var fileInfo in textResourceFilesInDirectory)
            {
                Common.Models.ApplicationLanguage applicationLanguage;
                await using (FileStream fileStream = new(fileInfo.FullName, FileMode.Open, FileAccess.Read))
                {
                    JsonSerializerOptions options = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
                    applicationLanguage = await JsonSerializer.DeserializeAsync<Common.Models.ApplicationLanguage>(fileStream, options);
                }

                applicationLanguages.Add(applicationLanguage);
            }

            return applicationLanguages;
        }
    }
}

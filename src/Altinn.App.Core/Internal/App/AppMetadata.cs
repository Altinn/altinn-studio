using System.Text;
using System.Text.Json;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Models;
using Microsoft.Extensions.Options;

namespace Altinn.App.Core.Internal.App
{
    /// <summary>
    /// Default implementation of IAppMetadata
    /// </summary>
    public class AppMetadata : IAppMetadata
    {
        private readonly AppSettings _settings;
        private readonly IFrontendFeatures _frontendFeatures;
        private ApplicationMetadata? _application;

        /// <summary>
        /// Initializes a new instance of the <see cref="AppMetadata"/> class.
        /// </summary>
        /// <param name="settings">The app repository settings.</param>
        /// <param name="frontendFeatures">Application features service</param>
        public AppMetadata(
            IOptions<AppSettings> settings,
            IFrontendFeatures frontendFeatures)
        {
            _settings = settings.Value;
            _frontendFeatures = frontendFeatures;
        }

        /// <inheritdoc />
        /// <exception cref="System.Text.Json.JsonException">Thrown if deserialization fails</exception>
        /// <exception cref="System.IO.FileNotFoundException">Thrown if applicationmetadata.json file not found</exception>
        public async Task<ApplicationMetadata> GetApplicationMetadata()
        {
            // Cache application metadata
            if (_application != null)
            {
                return _application;
            }

            string filename = Path.Join(_settings.AppBasePath, _settings.ConfigurationFolder, _settings.ApplicationMetadataFileName);
            try
            {
                if (File.Exists(filename))
                {
                    JsonSerializerOptions jsonSerializerOptions = new JsonSerializerOptions()
                    {
                        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                        PropertyNameCaseInsensitive = true,
                        AllowTrailingCommas = true
                    };
                    using FileStream fileStream = File.OpenRead(filename);
                    var application = await JsonSerializer.DeserializeAsync<ApplicationMetadata>(fileStream, jsonSerializerOptions);
                    if (application == null)
                    {
                        throw new ApplicationConfigException($"Deserialization returned null, Could indicate problems with deserialization of {filename}");
                    }
                    
                    application.Features = await _frontendFeatures.GetFrontendFeatures();
                    _application = application;

                    return _application;
                }

                throw new ApplicationConfigException($"Unable to locate application metadata file: {filename}");
            }
            catch (JsonException ex)
            {
                throw new ApplicationConfigException($"Something went wrong when parsing application metadata file: {filename}", ex);
            }
        }

        /// <inheritdoc />
        public async Task<string> GetApplicationXACMLPolicy()
        {
            string filename = Path.Join(_settings.AppBasePath, _settings.ConfigurationFolder, _settings.AuthorizationFolder, _settings.ApplicationXACMLPolicyFileName);
            if (File.Exists(filename))
            {
                return await File.ReadAllTextAsync(filename, Encoding.UTF8);
            }

            throw new FileNotFoundException($"XACML file {filename} not found");
        }

        /// <inheritdoc />
        public async Task<string> GetApplicationBPMNProcess()
        {
            string filename = Path.Join(_settings.AppBasePath, _settings.ConfigurationFolder, _settings.ProcessFolder, _settings.ProcessFileName);
            if (File.Exists(filename))
            {
                return await File.ReadAllTextAsync(filename, Encoding.UTF8);
            }

            throw new ApplicationConfigException($"Unable to locate application process file: {filename}");
        }
    }
}

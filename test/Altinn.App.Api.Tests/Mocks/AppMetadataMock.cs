using System.Text.Json;
using System.Text;
using Altinn.App.Api.Tests.Mocks;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Options;

using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Extensions;
using Altinn.App.Api.Tests.Data;

namespace App.IntegrationTests.Mocks.Services
{
    public class AppMetadataMock : IAppMetadata
    {
        private readonly AppSettings _settings;
        private readonly IFrontendFeatures _frontendFeatures;
        private ApplicationMetadata? _application;
        private readonly IHttpContextAccessor _contextAccessor;

        /// <summary>
        /// Initializes a new instance of the <see cref="AppMetadata"/> class.
        /// </summary>
        /// <param name="settings">The app repository settings.</param>
        /// <param name="frontendFeatures">Application features service</param>
        public AppMetadataMock(
            IOptions<AppSettings> settings,
            IFrontendFeatures frontendFeatures,
            IHttpContextAccessor httpContextAccessor)
        {
            _settings = settings.Value;
            _frontendFeatures = frontendFeatures;
            _contextAccessor = httpContextAccessor;
        }

        /// <inheritdoc />
        /// <exception cref="JsonException">Thrown if deserialization fails</exception>
        /// <exception cref="FileNotFoundException">Thrown if applicationmetadata.json file not found</exception>
        public async Task<ApplicationMetadata> GetApplicationMetadata()
        {
            // Cache application metadata
            if (_application != null)
            {
                return _application;
            }

            if (_contextAccessor.HttpContext == null)
            {
                throw new Exception("HttpContext is null");
            }

            AppIdentifier appIdentifier = AppIdentifier.CreateFromUrl(_contextAccessor.HttpContext.Request.GetDisplayUrl());
            string filename = TestData.GetApplicationMetadataPath(appIdentifier.Org, appIdentifier.App);

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

        public static Task<Application> GetApplication(string org, string app)
        {
            return Task.FromResult(GetTestApplication(org, app));
        }

        private static Application GetTestApplication(string org, string app)
        {
            string applicationPath = Path.Combine(GetMetadataPath(), org, app, "applicationmetadata.json");
            if (File.Exists(applicationPath))
            {
                string content = File.ReadAllText(applicationPath) ?? throw new Exception($"Unable to read application metadata file for {org}/{app}. Tried path: {applicationPath}");

                if (JsonSerializer.Deserialize<Application>(content) is not Application application)
                {
                    throw new Exception($"Unable to deserialize application metadata file for {org}/{app}. Tried path: {applicationPath}");
                }

                return application;
            }

            throw new Exception($"Unable to locate application metadata file for {org}/{app}. Tried path: {applicationPath}");
        }

        private static string GetMetadataPath()
        {
            var uri = new Uri(typeof(InstanceClientMockSi).Assembly.Location);
            string unitTestFolder = Path.GetDirectoryName(uri.LocalPath) ?? throw new Exception($"Unable to locate path {uri.LocalPath}");

            return Path.Combine(unitTestFolder, @"../../../Data/Metadata");
        }
    }
}

using System;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Models;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.Designer.Services.Models;
using Microsoft.Extensions.Logging;
using Microsoft.Rest.TransientFaultHandling;

namespace AltinnCore.Designer.Services
{
    /// <summary>
    /// ApplicationMetadataService
    /// </summary>
    public class ApplicationMetadataService : IApplicationMetadataService
    {
        private readonly ILogger _logger;
        private readonly IRepository _repository;
        private readonly IHttpClientFactory _httpClientFactory;
        private HttpClient _httpClient;
        private string _commitId;
        private string _org;
        private string _app;

        /// <summary>
        /// Constructor
        /// </summary>
        /// <param name="logger">ILogger of type ApplicationMetadataService</param>
        /// <param name="repository">IRepository</param>
        /// <param name="httpClientFactory">IHttpClientFactory</param>
        public ApplicationMetadataService(
            ILogger<ApplicationMetadataService> logger,
            IRepository repository,
            IHttpClientFactory httpClientFactory)
        {
            _logger = logger;
            _repository = repository;
            _httpClientFactory = httpClientFactory;
        }

        /// <inheritdoc />
        public async Task RegisterApplicationInStorageAsync(
            string org,
            string app,
            string commitId,
            EnvironmentModel deploymentEnvironment)
        {
            _org = org;
            _app = app;
            _commitId = commitId;
            _httpClient = GetHttpClientFromHttpClientFactory(deploymentEnvironment);

            Application applicationFromRepository = CreateRepositoryAppForOldApps();
            Application application;
            try
            {
                application = await GetApplication();
            }
            catch (HttpRequestWithStatusException e) when (e.StatusCode == HttpStatusCode.NotFound)
            {
                _logger.LogError(e.Message);
                await CreateApplicationMetadata(applicationFromRepository);
                return;
            }

            await UpdateApplicationMetadata(application, applicationFromRepository);
        }

        private Application CreateRepositoryAppForOldApps()
        {
            Application applicationFromRepository = _repository.GetApplication(_org, _app);

            // for old apps the application meta data file was not generated, so create the application meta data file
            // but the metadata for attachment will not be available on deployment
            if (applicationFromRepository == null)
            {
                // TODO: Application title handling (issue #2053/#1725)
                _repository.CreateApplication(_org, _app, _app);
                applicationFromRepository = _repository.GetApplication(_org, _app);
            }

            return applicationFromRepository;
        }

        private HttpClient GetHttpClientFromHttpClientFactory(EnvironmentModel deploymentEnvironment)
        {
            var httpClient = _httpClientFactory.CreateClient(deploymentEnvironment.Hostname);
            var uri = $"https://{deploymentEnvironment.PlatformPrefix}.{deploymentEnvironment.Hostname}/storage/api/v1/applications/";
            httpClient.BaseAddress = new Uri(uri);

            return httpClient;
        }

        private async Task<Application> GetApplication()
        {
            HttpResponseMessage response = await _httpClient.GetAsync($"{_org}/{_app}");
            return await response.Content.ReadAsAsync<Application>();
        }

        private async Task CreateApplicationMetadata(Application applicationFromRepository)
        {
            Application appMetadata = new Application
            {
                Id = $"{_org}/{_app}",
                Org = applicationFromRepository.Org,
                CreatedBy = applicationFromRepository.CreatedBy,
                CreatedDateTime = applicationFromRepository.CreatedDateTime,
                ElementTypes = applicationFromRepository.ElementTypes,
                Title = applicationFromRepository.Title,
                PartyTypesAllowed = applicationFromRepository.PartyTypesAllowed,
                VersionId = _commitId
            };
            await _httpClient.PostAsJsonAsync($"?appId={_org}/{_app}", appMetadata);
        }

        private async Task UpdateApplicationMetadata(Application application, Application applicationFromRepository)
        {
            application.Title = applicationFromRepository.Title;
            application.VersionId = _commitId;
            application.ElementTypes = applicationFromRepository.ElementTypes;
            application.PartyTypesAllowed = applicationFromRepository.PartyTypesAllowed;
            await _httpClient.PutAsJsonAsync($"{_org}/{_app}", application);
        }
    }
}

using System.Net;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Models;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.Designer.TypedHttpClients.AltinnStorage;
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
        private readonly IAltinnApplicationStorageService _altinnApplicationStorageService;

        /// <summary>
        /// Constructor
        /// </summary>
        /// <param name="logger">ILogger of type ApplicationMetadataService</param>
        /// <param name="repository">IRepository</param>
        /// <param name="altinnApplicationStorageService">IAltinnApplicationStorageService</param>
        public ApplicationMetadataService(
            ILogger<ApplicationMetadataService> logger,
            IRepository repository,
            IAltinnApplicationStorageService altinnApplicationStorageService)
        {
            _logger = logger;
            _repository = repository;
            _altinnApplicationStorageService = altinnApplicationStorageService;
        }

        /// <inheritdoc />
        public async Task RegisterApplicationInStorageAsync(string org, string app, string commitId)
        {
            Application applicationFromRepository = _repository.GetApplication(org, app);

            // for old apps the application meta data file was not generated, so create the application meta data file
            // but the metadata for attachment will not be available on deployment
            if (applicationFromRepository == null)
            {
                // TODO: Application title handling (issue #2053/#1725)
                _repository.CreateApplication(org, app, app);
                applicationFromRepository = _repository.GetApplication(org, app);
            }

            Application application;
            try
            {
                application = await _altinnApplicationStorageService.GetAsync(org, app);
            }
            catch (HttpRequestWithStatusException e) when (e.StatusCode == HttpStatusCode.NotFound)
            {
                _logger.LogError(e.Message);
                Application appMetadata = new Application
                {
                    Id = $"{org}/{app}",
                    Org = applicationFromRepository.Org,
                    CreatedBy = applicationFromRepository.CreatedBy,
                    CreatedDateTime = applicationFromRepository.CreatedDateTime,
                    ElementTypes = applicationFromRepository.ElementTypes,
                    Title = applicationFromRepository.Title,
                    PartyTypesAllowed = applicationFromRepository.PartyTypesAllowed,
                    VersionId = commitId
                };
                await _altinnApplicationStorageService.CreateAsync(org, app, appMetadata);
                return;
            }

            application.Title = applicationFromRepository.Title;
            application.VersionId = commitId;
            application.ElementTypes = applicationFromRepository.ElementTypes;
            application.PartyTypesAllowed = applicationFromRepository.PartyTypesAllowed;
            await _altinnApplicationStorageService.UpdateAsync(org, app, application);
        }
    }
}

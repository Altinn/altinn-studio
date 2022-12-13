using System;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using Altinn.ResourceRegistry.Core.Models;
using Altinn.ResourceRegistry.Models;
using Microsoft.Extensions.Logging;

namespace Altinn.ResourceRegistry.Core
{
    /// <summary>
    /// Service implementation for operations on the resource registry
    /// </summary>
    public class ResourceRegistryService : IResourceRegistry
    {
        private IResourceRegistryRepository _repository;
        private IPolicyRepository _policyRepository;
        private readonly ILogger<ResourceRegistryService> _logger;

        /// <summary>
        /// Creates a new instance of the <see cref="ResourceRegistryService"/> service.
        /// The ResourceRegistryService is responcible for business logic and implementations for working with the resource registry
        /// </summary>
        /// <param name="repository">Resource registry repository implementation for dependencies to its operations</param>
        /// <param name="policyRepository">Repository implementation for operations on policies</param>
        /// <param name="logger">Logger</param>
        public ResourceRegistryService(IResourceRegistryRepository repository, IPolicyRepository policyRepository, ILogger<ResourceRegistryService> logger)
        {
            _repository = repository;
            _policyRepository = policyRepository;
            _logger = logger;
        }

        /// <inheritdoc/>
        public async Task CreateResource(ServiceResource serviceResource)
        {
            await _repository.CreateResource(serviceResource);
        }

        /// <inheritdoc/>
        public async Task UpdateResource(ServiceResource serviceResource)
        {
            await _repository.UpdateResource(serviceResource);
        }

        /// <inheritdoc/>
        public async Task Delete(string id)
        {
            await _repository.DeleteResource(id);
        }

        /// <inheritdoc/>
        public async Task<ServiceResource> GetResource(string id)
        {
            return await _repository.GetResource(id);
        }

        /// <inheritdoc/>
        public async Task<List<ServiceResource>> Search(ResourceSearch resourceSearch)
        {
            return await _repository.Search(resourceSearch);
        }

        /// <inheritdoc/>
        public async Task<bool> StorePolicy(ServiceResource serviceResources, Stream fileStream)
        {
            throw new NotImplementedException();
        }

        /// <inheritdoc/>
        public async Task<Stream> GetPolicy(ServiceResource serviceResource)
        {
              return await _policyRepository.GetPolicyAsync(serviceResource.Identifier);
        }
    }
}

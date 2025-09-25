using System;
using System.Threading.Tasks;

using Altinn.Platform.Authorization.Repositories.Interface;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Platform.Storage.Repository;

namespace Altinn.Platform.Authorization.Repositories
{
    /// <summary>
    /// Repository for retrieving instance information
    /// </summary>
    public class PolicyInformationRepository : IPolicyInformationRepository
    {
        private readonly IInstanceRepository _instanceRepository;

        /// <summary>
        /// Initializes a new instance of the <see cref="PolicyInformationRepository"/> class
        /// </summary>
        /// <param name="cosmosettings">the configuration settings for cosmos database</param>
        /// <param name="logger">the logger</param>
        public PolicyInformationRepository(IInstanceRepository instanceRepository)
        {
            this._instanceRepository = instanceRepository;
        }

        /// <inheritdoc/>
        public Task<Instance> GetInstance(string instanceId, int instanceOwnerId)
        {
            if (instanceOwnerId <= 0)
            {
                throw new ArgumentException("Instance owner id cannot be zero or negative");
            }

            string[] instanceIdParts = instanceId.Split("/");
            return _instanceRepository.GetOne(int.Parse(instanceIdParts[0]), Guid.Parse(instanceIdParts[1]));
        }


        /// <inheritdoc/>
        public async Task<Instance> GetInstance(string instanceId)
        {
            string[] instanceIdParts = instanceId.Split("/");
            return await _instanceRepository.GetOne(int.Parse(instanceIdParts[0]), Guid.Parse(instanceIdParts[1]));
        }


        public Task<Application> GetApplication(string app, string org)
        {
            throw new NotImplementedException();
        }
    }
}

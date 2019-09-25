using System.Threading.Tasks;
using Altinn.Platform.Storage.Models;
using AltinnCore.Common.Services.Interfaces;

namespace AltinnCore.Common.Services.Implementation
{
    /// <summary>
    /// service implementation for application in studio mode
    /// </summary>
    public class ApplicationStudioSI : IApplication
    {
        private readonly IRepository _repository;

        /// <summary>
        /// Initializes a new application of the <see cref="ApplicationStudioSI"/> class.
        /// </summary>
        /// <param name="repository">repository service</param>
        public ApplicationStudioSI(IRepository repository)
        {
            _repository = repository;
        }

        /// <inheritdoc/>
        public Task<Application> GetApplication(string org, string app)
        {
            Application application = _repository.GetApplication(org, app);
            return Task.FromResult(application);
        }
    }
}

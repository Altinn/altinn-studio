using Altinn.Platform.Events.Models;
using Altinn.Platform.Events.Services.Interfaces;
using Microsoft.Extensions.Logging;

namespace Altinn.Platform.Events.Repository
{
    /// <summary>
    /// Handles events repository. Notice that the all methods should modify the Subject attribute of the
    /// CloudEvent, since cosmosDb fails if Subject contains slashes '/'.
    /// </summary>
    public class NewEventsRepository : INewEventsRepository
    {
        private readonly IEventsPostgresService _postgresService;
        private readonly ILogger _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="EventsRepository"/> class.
        /// </summary>
        /// <param name="postgresService">the cosmos DB service</param>
        /// <param name="logger">the logger</param>
        public NewEventsRepository(IEventsPostgresService postgresService, ILogger<NewEventsRepository> logger)
        {
            _postgresService = postgresService;
            _logger = logger;
        }

        /// <summary>
        /// Something smart
        /// </summary>
        public int Create(CloudEvent item)
        {
            return _postgresService.StoreItemtToEventsCollection(item);
        }
    }
}
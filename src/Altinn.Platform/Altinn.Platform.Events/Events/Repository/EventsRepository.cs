using System.IO;
using System.Threading.Tasks;

using Altinn.Platform.Events.Models;
using Altinn.Platform.Events.Services.Interfaces;
using Microsoft.Azure.Documents;
using Microsoft.Extensions.Logging;

namespace Altinn.Platform.Events.Repository
{
    /// <summary>
    /// Handles events repository. Notice that the all methods should modify the Subject attribute of the
    /// CloudEvent, since cosmosDb fails if Subject contains slashes '/'.
    /// </summary>
    public class EventsRepository : IEventsRepository
    {
        private readonly IEventsCosmosService _cosmosService;
        private readonly string _triggerId = "trgUpdateItemTimestamp";
        private readonly string _triggerPath = "./Configuration/UpdateItemTimestamp.js";
        private readonly ILogger _logger;
        private bool _triggersRegistered = false;

        /// <summary>
        /// Initializes a new instance of the <see cref="EventsRepository"/> class.
        /// </summary>
        /// <param name="cosmosService">the cosmos DB service</param>
        /// <param name="logger">the logger</param>
        public EventsRepository(IEventsCosmosService cosmosService, ILogger<EventsRepository> logger)
        {
            _cosmosService = cosmosService;
            _logger = logger;
        }

        /// <inheritdoc/>
        public async Task<string> Create(CloudEvent item)
        {
            if (!_triggersRegistered)
            {
                await EnsureTriggerIsPresent();
            }

            string id = await _cosmosService.StoreItemtToEventsCollection(item);
            return id;
        }

        private async Task EnsureTriggerIsPresent()
        {
            if (!File.Exists(_triggerPath))
            {
                _logger.LogCritical($"Unable to find trigger function on path {_triggerPath}.");
                return;
            }

            Trigger trigger = new Trigger();
            trigger.Id = _triggerId;
            trigger.Body = File.ReadAllText(_triggerPath);
            trigger.TriggerOperation = TriggerOperation.Create;
            trigger.TriggerType = TriggerType.Pre;

            bool successful = await _cosmosService.StoreTrigger(trigger);
            if (successful)
            {
                _triggersRegistered = true;
            }
        }
    }
}

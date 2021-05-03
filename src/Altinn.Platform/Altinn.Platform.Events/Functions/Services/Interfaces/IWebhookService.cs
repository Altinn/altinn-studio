using System.Threading.Tasks;
using Altinn.Platform.Events.Functions.Models;

namespace Altinn.Platform.Events.Functions.Services.Interfaces
{
    /// <summary>
    /// Interface to send content to webhooks
    /// </summary>
    public interface IWebhookService
    {
        /// <summary>
        /// Send cloudevent to webhook
        /// </summary>
        /// <param name="item">CloudEventEnvelope, includes content and uri</param>
        Task Send(CloudEventEnvelope item);
    }
}

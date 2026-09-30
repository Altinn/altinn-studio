#nullable disable

using System;
using System.Threading.Tasks;
using Altinn.Platform.Events.Models;

namespace Altinn.Platform.Events.Repository
{
    /// <summary>
    /// Interface describing client implementations for the Events component in the Altinn 3 platform.
    /// </summary>
    public interface IEventsRepository
    {
        /// <summary>
        /// Creates an cloud event in repository
        /// </summary>
        /// <param name="item">the cloud event object</param>
        /// <param name="idempotencyKey">
        /// The caller's key for this registration, or null when it sent none. A key is globally unique and
        /// registers exactly one event.
        /// </param>
        /// <returns>the created event, or the existing one when the key has been seen before</returns>
        Task<CloudEventCreateResult> Create(CloudEvent item, Guid? idempotencyKey = null);
    }

    /// <summary>
    /// The outcome of registering a cloud event.
    /// </summary>
    /// <param name="Id">The id of the stored event - the existing one when this was a duplicate.</param>
    /// <param name="IsDuplicate">Whether the idempotency key had already registered an event.</param>
    public readonly record struct CloudEventCreateResult(string Id, bool IsDuplicate);
}

using System;
using System.Net;
using System.Net.Http.Headers;
using System.Reflection;
using System.Threading.Tasks;
using Altinn.Platform.Events.Models;
using Altinn.Platform.Events.Services.Interfaces;
using Microsoft.Azure.Documents;

namespace Altinn.Platform.Events.Tests.Mocks
{
    /// <summary>
    /// Class that mocks the failing of storing and retrieving documents from Cosmos DB.
    /// </summary>
    public class EventsCosmosServiceMockFails : IEventsCosmosService
    {
        private readonly bool _failStoreItem;
        private readonly bool _failStoreTrigger;

        /// <summary>
        /// Initializes a new instance of the <see cref="EventsCosmosServiceMockFails"/> class.
        /// </summary>
        /// <param name="failStoreItem">Boolean indicating if the storeItem method should fail</param>
        /// <param name="failStoreTrigger">Boolean indicating if the storeTrigger method should fail</param>
        public EventsCosmosServiceMockFails(bool failStoreItem = true, bool failStoreTrigger = true)
        {
            _failStoreItem = failStoreItem;
            _failStoreTrigger = failStoreTrigger;
        }

        /// <inheritdoc/>
        public Task<string> StoreItemtToEventsCollection<T>(T item, bool applyTrigger = true)
        {
            if (!_failStoreItem)
            {
                return Task.FromResult(Guid.NewGuid().ToString());
            }

            throw new Exception();

        }

        /// <inheritdoc/>
        public Task<bool> StoreTrigger(Trigger trigger)
        {
            if (!_failStoreTrigger)
            {
                return Task.FromResult(true);
            }

            throw CreateDocumentClientExceptionForTesting(new Error(), HttpStatusCode.Conflict);
        }

        private static DocumentClientException CreateDocumentClientExceptionForTesting(
                                         Error error, HttpStatusCode httpStatusCode)
        {
            var type = typeof(DocumentClientException);

            var documentClientExceptionInstance = type.Assembly.CreateInstance(
                type.FullName,
                false,
                BindingFlags.Instance | BindingFlags.NonPublic,
                null,
                new object[] { error, (HttpResponseHeaders)null, httpStatusCode },
                null,
                null);

            return (DocumentClientException)documentClientExceptionInstance;
        }
    }
}

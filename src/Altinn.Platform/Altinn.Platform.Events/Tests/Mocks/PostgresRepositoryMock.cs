using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.Platform.Events.Models;
using Altinn.Platform.Events.Repository.Interfaces;

namespace Altinn.Platform.Events.Tests.Mocks
{
    /// <summary>
    /// Class that mocks storing and retrieving documents from postgres DB.
    /// </summary>
    public class PostgresRepositoryMock : IPostgresRepository
    {
        /// <inheritdoc/>
        public Task<string> Create(CloudEvent cloudEvent)
        {
            return Task.FromResult(cloudEvent.Id);
        }

        public Task<List<CloudEvent>> Get(string after, DateTime? from, DateTime? to, string subject, List<string> source, List<string> type, int size)
        {
            throw new NotImplementedException();
        }
    }
}

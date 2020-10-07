using System.Collections.Generic;
using System.Threading.Tasks;

using Altinn.App.PlatformServices.Interface;
using Altinn.Platform.Storage.Interface.Models;

namespace App.IntegrationTests.Mocks.Services
{
    public class EventsMockSI : IEvents
    {
        public static List<(string eventType, Instance instance)> Requests = new List<(string, Instance)>();

        public Task<string> AddEvent(string eventType, Instance instance)
        {
            Requests.Add((eventType, instance));

            return Task.FromResult(eventType);
        }
    }
}

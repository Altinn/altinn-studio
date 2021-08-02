using System.Threading.Tasks;

using Altinn.App.PlatformServices.Interface;
using Altinn.Platform.Storage.Interface.Models;

namespace App.IntegrationTests.Mocks.Services
{
    public class EventsMockSI : IEvents
    {
        public async Task<string> AddEvent(string eventType, Instance instance)
        {
            return await Task.FromResult(eventType);
        }
    }
}

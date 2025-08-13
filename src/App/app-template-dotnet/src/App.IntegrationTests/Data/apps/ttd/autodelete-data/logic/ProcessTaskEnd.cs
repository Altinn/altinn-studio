using System.Threading.Tasks;
using Altinn.App.Core.Features;
using Altinn.App.Core.Interface;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Http;

namespace App.IntegrationTests.Mocks.Apps.Ttd.AutoDeleteData
{
    public class ProcessTaskEnd: IProcessTaskEnd
    {
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly IInstance _instanceService;
        
        public ProcessTaskEnd(IHttpContextAccessor httpContextAccessor, IInstance instanceService)
        {
            _httpContextAccessor = httpContextAccessor;
            _instanceService = instanceService;
        }
        
        public async Task End(string taskId, Instance instance)
        {
            var customDataValues = new DataValues() { Values = new System.Collections.Generic.Dictionary<string, string>() { { "customKey", "customValue" } } };
            var instanceIdentifier = InstanceIdentifier.CreateFromUrl(_httpContextAccessor.HttpContext.Request.Path.Value);

            await _instanceService.UpdateDataValues(instanceIdentifier.InstanceOwnerPartyId, instanceIdentifier.InstanceGuid, customDataValues);

            await Task.CompletedTask;
        }
    }
}

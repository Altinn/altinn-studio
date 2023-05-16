using Altinn.ApiClients.Maskinporten.Interfaces;
using Altinn.ApiClients.Maskinporten.Models;
using Altinn.Studio.Designer.Services.Interfaces;

namespace Altinn.Studio.Designer.Services.Implementation
{
    public class MaskinportenClient : IMaskinportenClient
    {
        private readonly IMaskinportenService _maskinPortenService;

        public MaskinportenClient()
        {
            //TokenResponse response = _maskinPortenService.GetToken();
        }
    }
}

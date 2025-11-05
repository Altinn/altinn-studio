#nullable disable
using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.Authorization.ABAC.Xacml;
using Altinn.ResourceRegistry.Core.Models.Altinn2;
using Altinn.Studio.Designer.Models;

namespace Altinn.Studio.Designer.TypedHttpClients.Altinn2Metadata
{
    public interface IAltinn2MetadataClient
    {
        Task<ServiceResource> GetServiceResourceFromService(string serviceCode, int serviceEditionCode, string environment);

        Task<XacmlPolicy> GetXacmlPolicy(string serviceCode, int serviceEditionCode, string identifier, string environment);

        Task<List<AvailableService>> AvailableServices(int languageId, string environment);
    }
}

using System.Threading.Tasks;
using Altinn.Authorization.ABAC.Xacml;
using Altinn.Studio.Designer.Models;

namespace Altinn.Studio.Designer.TypedHttpClients.Altinn2Metadata
{
    public interface IAltinn2MetadataClient
    {
        Task<ServiceResource> GetServiceResourceFromService(string serviceCode, int serviceEditionCode);

        Task<XacmlPolicy> GetXacmlPolicy(string serviceCode, int serviceEditionCode, string identifier);   
    }
}

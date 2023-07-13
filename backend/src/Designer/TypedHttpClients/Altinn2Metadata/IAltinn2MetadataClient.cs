using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;

namespace Altinn.Studio.Designer.TypedHttpClients.Altinn2Metadata
{
    public interface IAltinn2MetadataClient
    {
        Task<ServiceResource> GetServiceResourceFromService(string serviceCode, int serviceEditionCode);
    }
}

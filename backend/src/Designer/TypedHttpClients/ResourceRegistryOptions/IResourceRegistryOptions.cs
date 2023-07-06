using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;

namespace Altinn.Studio.Designer.TypedHttpClients.ResourceRegistryOptions
{
    public interface IResourceRegistryOptions
    {
        Task<DataThemesContainer> GetSectors();

        Task<LosTerms> GetLosTerms();

        Task<EuroVocTerms> GetEuroVocTerms();
    }
}

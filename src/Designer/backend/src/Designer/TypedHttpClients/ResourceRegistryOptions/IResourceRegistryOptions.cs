#nullable disable
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;

namespace Altinn.Studio.Designer.TypedHttpClients.ResourceRegistryOptions
{
    public interface IResourceRegistryOptions
    {
        Task<DataThemesContainer> GetSectors(CancellationToken cancellationToken = default);

        Task<LosTerms> GetLosTerms(CancellationToken cancellationToken = default);

        Task<EuroVocTerms> GetEuroVocTerms(CancellationToken cancellationToken = default);
    }
}

using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;

namespace Altinn.Studio.Designer.Services.Interfaces;

public interface IKafkaProducer
{
    Task<StudioStatisticsModel> ProduceAsync(StudioStatisticsModel studioStatisticsModel, CancellationToken cancellationToken = default);
}

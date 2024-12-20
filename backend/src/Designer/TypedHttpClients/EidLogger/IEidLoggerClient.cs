using System.Threading;
using System.Threading.Tasks;

namespace Altinn.Studio.Designer.TypedHttpClients.EidLogger;

public interface IEidLoggerClient
{
    public Task Log(EidLogRequest request, CancellationToken cancellationToken = default);
}

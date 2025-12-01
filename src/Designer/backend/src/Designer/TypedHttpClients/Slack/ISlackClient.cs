#nullable disable
using System.Threading;
using System.Threading.Tasks;

namespace Altinn.Studio.Designer.TypedHttpClients.Slack
{
    public interface ISlackClient
    {
        public Task SendMessage(SlackRequest request, CancellationToken cancellationToken = default);
    }
}

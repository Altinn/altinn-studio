using System;
using System.Threading;
using System.Threading.Tasks;

namespace Altinn.Studio.Designer.TypedHttpClients.Slack;

public interface ISlackClient
{
    Task SendMessageAsync(Uri webhookUrl, SlackMessage message, CancellationToken cancellationToken = default);
}

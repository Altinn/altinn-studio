using System;
using System.Net.Http;
using System.Net.Mime;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

namespace Altinn.Studio.Designer.TypedHttpClients.Slack;

public class SlackClient(HttpClient httpClient) : ISlackClient
{
    public async Task SendMessageAsync(Uri webhookUrl, SlackMessage message, CancellationToken cancellationToken = default)
    {
        using var payloadContent = new StringContent(
            JsonSerializer.Serialize(message),
            Encoding.UTF8,
            MediaTypeNames.Application.Json);

        using var response = await httpClient.PostAsync(webhookUrl, payloadContent, cancellationToken);
        response.EnsureSuccessStatusCode();
    }
}

using System;
using System.Net.Http;
using System.Net.Mime;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Telemetry;

namespace Altinn.Studio.Designer.TypedHttpClients.Slack;

public class SlackClient(HttpClient httpClient) : ISlackClient
{
    public async Task SendMessageAsync(
        Uri webhookUrl,
        SlackMessage message,
        CancellationToken cancellationToken = default
    )
    {
        using var payloadContent = new StringContent(
            JsonSerializer.Serialize(message),
            Encoding.UTF8,
            MediaTypeNames.Application.Json
        );

        using var request = new HttpRequestMessage(HttpMethod.Post, webhookUrl) { Content = payloadContent };
        request.MarkSecretUrlPath();
        using var response = await httpClient.SendAsync(request, cancellationToken);
        response.EnsureSuccessStatusCode();
    }
}

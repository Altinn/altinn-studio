using StudioGateway.Api.Clients.SlackClient.Contracts;

namespace StudioGateway.Api.Clients.SlackClient;

internal sealed class SlackClient(HttpClient httpClient) : ISlackClient
{
    public async Task SendMessageAsync(SlackMessage message, CancellationToken cancellationToken)
    {
        HttpResponseMessage response = await httpClient.PostAsJsonAsync(
            string.Empty,
            message,
            AppJsonSerializerContext.Default.SlackMessage,
            cancellationToken
        );

        response.EnsureSuccessStatusCode();
    }
}

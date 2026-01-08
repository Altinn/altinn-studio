using StudioGateway.Api.Clients.SlackClient.Contracts;

namespace StudioGateway.Api.Clients.SlackClient;

internal interface ISlackClient
{
    Task SendMessageAsync(SlackMessage message, CancellationToken cancellationToken);
}

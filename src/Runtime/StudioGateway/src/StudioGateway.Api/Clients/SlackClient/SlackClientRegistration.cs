using Microsoft.Extensions.Options;
using StudioGateway.Api.Settings;

namespace StudioGateway.Api.Clients.SlackClient;

internal static class SlackClientRegistration
{
    public static IServiceCollection AddSlackClient(this IServiceCollection services)
    {
        services
            .AddHttpClient<ISlackClient, SlackClient>(
                (serviceProvider, httpClient) =>
                {
                    var slackSettings = serviceProvider
                        .GetRequiredService<IOptionsMonitor<SlackSettings>>()
                        .CurrentValue;
                    httpClient.BaseAddress = slackSettings.WebhookUrl;
                }
            )
            .AddStandardResilienceHandler(options =>
            {
                options.Retry.MaxRetryAttempts = 3;
                options.Retry.UseJitter = true;
                options.Retry.ShouldHandle = args =>
                    ValueTask.FromResult(
                        args.Outcome switch
                        {
                            { Exception: not null } => true,
                            { Result.IsSuccessStatusCode: false } => true,
                            _ => false,
                        }
                    );
            });

        return services;
    }
}

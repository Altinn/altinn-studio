using Altinn.App.Clients.Fiks.Configuration;
using Altinn.App.Clients.Fiks.Constants;
using Altinn.App.Clients.Fiks.FiksArkiv;
using Altinn.App.Clients.Fiks.FiksArkiv.Models;
using Altinn.App.Clients.Fiks.FiksIO;
using Altinn.App.Clients.Fiks.FiksIO.Models;
using Altinn.App.Core.Extensions;
using Altinn.App.Core.Features.Maskinporten.Exceptions;
using Altinn.App.Core.Internal.AltinnCdn;
using Altinn.App.Core.Internal.Process.ProcessTasks.ServiceTasks;
using KS.Fiks.IO.Send.Client.Exceptions;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Polly;
using Polly.Retry;

namespace Altinn.App.Clients.Fiks.Extensions;

/// <summary>
/// Extension methods for setting up Fiks IO and Fiks Arkiv services.
/// </summary>
public static class ServiceCollectionExtensions
{
    /// <summary>
    /// Adds a Fiks IO client to the service collection.
    /// </summary>
    /// <param name="services">The target <see cref="IServiceCollection"/>.</param>
    /// <returns>A <see cref="FiksIOSetupBuilder"/> instance that can be used to configure the Fiks IO client.</returns>
    public static IFiksIOSetupBuilder AddFiksIOClient(this IServiceCollection services)
    {
        if (services.IsConfigured<FiksIOSettings>() is false)
            services.ConfigureFiksIOClient("FiksIOSettings");

        services.AddSingleton<IFiksIOClientFactory, FiksIOClientFactory>();
        services.AddSingleton<IFiksIOClient, FiksIOClient>();
        services.AddDefaultFiksIOResiliencePipeline();

        return new FiksIOSetupBuilder(services);
    }

    /// <summary>
    /// Adds a Fiks Arkiv client and all relevant dependencies to the service collection.
    /// </summary>
    /// <param name="services">The target <see cref="IServiceCollection"/>.</param>
    /// <returns>A <see cref="FiksSetupBuilder"/> instance that can be used to configure the Fiks Arkiv client.</returns>
    public static IFiksArkivSetupBuilder AddFiksArkiv(this IServiceCollection services)
    {
        if (services.IsConfigured<FiksArkivSettings>() is false)
            services.ConfigureFiksArkiv("FiksArkivSettings");

        services.AddFiksIOClient();
        services.AddAltinnCdnClient();
        services.AddSingleton<IServiceTask, FiksArkivServiceTask>();
        services.AddSingleton<IFiksArkivHost, FiksArkivHost>();
        services.AddSingleton<IFiksArkivPayloadGenerator, FiksArkivDefaultPayloadGenerator>();
        services.AddSingleton<IFiksArkivResponseHandler, FiksArkivDefaultResponseHandler>();
        services.AddSingleton<IFiksArkivInstanceClient, FiksArkivInstanceClient>();
        services.AddSingleton<IFiksArkivConfigResolver, FiksArkivConfigResolver>();
        services.AddHostedService<FiksArkivConfigValidationService>();
        services.AddHostedService(sp => (FiksArkivHost)sp.GetRequiredService<IFiksArkivHost>());

        return new FiksArkivSetupBuilder(services);
    }

    /// <summary>
    /// Configures the Fiks IO client with the provided options.
    /// </summary>
    /// <param name="services">The target <see cref="IServiceCollection"/>.</param>
    /// <param name="configureOptions">Configuration delegate.</param>
    public static IServiceCollection ConfigureFiksIOClient(
        this IServiceCollection services,
        Action<FiksIOSettings> configureOptions
    )
    {
        services.AddOptions<FiksIOSettings>().Configure(configureOptions).ValidateDataAnnotations();
        return services;
    }

    /// <summary>
    /// Configures the Fiks IO client with the options from the specified configuration section.
    /// </summary>
    /// <param name="services">The target <see cref="IServiceCollection"/>.</param>
    /// <param name="configSectionPath">Configuration section path.</param>
    public static IServiceCollection ConfigureFiksIOClient(this IServiceCollection services, string configSectionPath)
    {
        services.AddOptions<FiksIOSettings>().BindConfiguration(configSectionPath).ValidateDataAnnotations();
        return services;
    }

    /// <summary>
    /// Configures the Fiks Arkiv client with the provided options.
    /// </summary>
    /// <param name="services">The target <see cref="IServiceCollection"/>.</param>
    /// <param name="configureOptions">Configuration delegate.</param>
    public static IServiceCollection ConfigureFiksArkiv(
        this IServiceCollection services,
        Action<FiksArkivSettings> configureOptions
    )
    {
        services.AddOptions<FiksArkivSettings>().Configure(configureOptions);
        return services;
    }

    /// <summary>
    /// Configures the Fiks Arkiv client with the options from the specified configuration section.
    /// </summary>
    /// <param name="services">The target <see cref="IServiceCollection"/>.</param>
    /// <param name="configSectionPath">Configuration section path.</param>
    public static IServiceCollection ConfigureFiksArkiv(this IServiceCollection services, string configSectionPath)
    {
        services
            .AddOptions<FiksArkivSettings>()
            .Configure(options =>
            {
                options.ErrorHandling = null;
                options.SuccessHandling = null;
                options.Documents = null;
                options.Receipt = null;
                options.Recipient = null;
                options.Metadata = null;
            })
            .BindConfiguration(configSectionPath);
        return services;
    }

    /// <summary>
    /// The default resilience pipeline for Fiks IO.
    /// </summary>
    private static IServiceCollection AddDefaultFiksIOResiliencePipeline(this IServiceCollection services)
    {
        services.AddResiliencePipeline<string, FiksIOMessageResponse>(
            FiksIOConstants.DefaultResiliencePipelineId,
            (builder, context) =>
            {
                var logger = context.ServiceProvider.GetRequiredService<ILogger<FiksIOClient>>();

                builder
                    .AddRetry(
                        new RetryStrategyOptions<FiksIOMessageResponse>
                        {
                            MaxRetryAttempts = 5,
                            Delay = TimeSpan.FromSeconds(1),
                            MaxDelay = TimeSpan.FromSeconds(10),
                            BackoffType = DelayBackoffType.Exponential,
                            ShouldHandle = new PredicateBuilder<FiksIOMessageResponse>().Handle<Exception>(ex =>
                            {
                                var shouldHandle = ErrorShouldBeHandled(ex);
                                if (shouldHandle is false)
                                    logger.LogInformation(
                                        ex,
                                        "Error is unrecoverable and will not be retried: {Exception}",
                                        ex.Message
                                    );

                                return shouldHandle;
                            }),
                            OnRetry = args =>
                            {
                                args.Context.Properties.TryGetValue(
                                    new ResiliencePropertyKey<FiksIOMessageRequest>(
                                        FiksIOConstants.MessageRequestPropertyKey
                                    ),
                                    out var messageRequest
                                );
                                logger.LogWarning(
                                    args.Outcome.Exception,
                                    "Failed to send FiksIO message {MessageType}:{ClientMessageId}. Retrying in {RetryDelay}",
                                    messageRequest?.MessageType,
                                    messageRequest?.SendersReference,
                                    args.RetryDelay
                                );
                                return ValueTask.CompletedTask;
                            },
                        }
                    )
                    .AddTimeout(TimeSpan.FromSeconds(2));
            }
        );

        return services;

        static bool ErrorShouldBeHandled(Exception ex)
        {
            if (ex is FiksIOSendUnauthorizedException or MaskinportenException)
                return false;

            if (
                ex is FiksIOSendUnexpectedResponseException unexpectedResponse
                && unexpectedResponse.Message.Contains("status code notfound", StringComparison.OrdinalIgnoreCase)
            )
                return false;

            return true;
        }
    }
}

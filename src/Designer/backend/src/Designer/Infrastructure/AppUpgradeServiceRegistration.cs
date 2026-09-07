using System;
using System.IO;
using System.Net.Http;
using System.Net.Sockets;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Services.Implementation;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.TypedHttpClients.AppUpgradeEngine;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace Altinn.Studio.Designer.Infrastructure;

public static class AppUpgradeServiceRegistration
{
    private const string EngineBaseAddress = "http://app-upgrade-engine/";

    public static IServiceCollection AddAppUpgrade(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<AppUpgradeSettings>(configuration.GetSection("AppUpgradeSettings"));
        services.AddTransient<IAppUpgradeService, AppUpgradeService>();
        services
            .AddHttpClient<IAppUpgradeEngineClient, AppUpgradeEngineClient>(
                (serviceProvider, client) =>
                {
                    AppUpgradeSettings settings = serviceProvider
                        .GetRequiredService<IOptions<AppUpgradeSettings>>()
                        .Value;
                    client.BaseAddress = new Uri(EngineBaseAddress);
                    client.Timeout = TimeSpan.FromSeconds(settings.TimeoutSeconds);
                }
            )
            .ConfigurePrimaryHttpMessageHandler(serviceProvider =>
            {
                AppUpgradeSettings settings = serviceProvider.GetRequiredService<IOptions<AppUpgradeSettings>>().Value;
                return new SocketsHttpHandler
                {
                    ConnectCallback = async (_, cancellationToken) =>
                    {
                        var socket = new Socket(AddressFamily.Unix, SocketType.Stream, ProtocolType.Unspecified);
                        try
                        {
                            await socket.ConnectAsync(
                                new UnixDomainSocketEndPoint(settings.EngineSocketPath),
                                cancellationToken
                            );
                            return new NetworkStream(socket, ownsSocket: true);
                        }
                        catch
                        {
                            socket.Dispose();
                            throw;
                        }
                    },
                };
            });
        return services;
    }
}

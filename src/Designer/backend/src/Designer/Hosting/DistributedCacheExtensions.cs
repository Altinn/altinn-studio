using System;
using Altinn.Studio.Designer.Configuration;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Caching.StackExchangeRedis;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.Studio.Designer.Hosting;

internal static class DistributedCacheExtensions
{
    public static void AddConfiguredDistributedCache(
        this IServiceCollection services,
        IConfiguration configuration,
        ISignalRServerBuilder signalRBuilder
    )
    {
        DistributedCacheSettings settings =
            configuration.GetSection(nameof(DistributedCacheSettings)).Get<DistributedCacheSettings>() ?? new();

        switch (settings.Type)
        {
            case DistributedCacheType.None:
                return;
            case DistributedCacheType.Memory:
                services.AddDistributedMemoryCache();
                return;
            case DistributedCacheType.Redis:
                AddRedisCache(services, configuration, signalRBuilder);
                return;
            case DistributedCacheType.Unknown:
            default:
                throw new InvalidOperationException(
                    $"{nameof(DistributedCacheSettings)}:{nameof(DistributedCacheSettings.Type)} must be configured."
                );
        }
    }

    private static void AddRedisCache(
        IServiceCollection services,
        IConfiguration configuration,
        ISignalRServerBuilder signalRBuilder
    )
    {
        RedisCacheSettings redisSettings =
            configuration.GetSection(nameof(RedisCacheSettings)).Get<RedisCacheSettings>() ?? new();

        if (string.IsNullOrWhiteSpace(redisSettings.ConnectionString))
        {
            throw new InvalidOperationException(
                $"{nameof(RedisCacheSettings)}:{nameof(RedisCacheSettings.ConnectionString)} must be configured when using Redis."
            );
        }

        services.AddStackExchangeRedisCache(options =>
        {
            options.Configuration = redisSettings.ConnectionString;
            options.InstanceName = redisSettings.InstanceName;
        });
        signalRBuilder.AddStackExchangeRedis(redisSettings.ConnectionString);
    }
}

#nullable enable
using System;
using System.Collections.Generic;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Hosting;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Caching.StackExchangeRedis;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace Designer.Tests.Hosting;

public class DistributedCacheExtensionsTests
{
    [Fact]
    public void AddConfiguredDistributedCache_WhenTypeIsMemory_RegistersMemoryCache()
    {
        using ServiceProvider services = BuildServices(DistributedCacheType.Memory);

        Assert.IsType<MemoryDistributedCache>(services.GetRequiredService<IDistributedCache>());
    }

    [Fact]
    public void AddConfiguredDistributedCache_WhenTypeIsRedis_RegistersRedisCache()
    {
        using ServiceProvider services = BuildServices(DistributedCacheType.Redis, "localhost:6379");

        Assert.IsAssignableFrom<RedisCache>(services.GetRequiredService<IDistributedCache>());
    }

    [Fact]
    public void AddConfiguredDistributedCache_WhenTypeIsNone_DoesNotRegisterCache()
    {
        using ServiceProvider services = BuildServices(DistributedCacheType.None);

        Assert.Null(services.GetService<IDistributedCache>());
    }

    [Fact]
    public void AddConfiguredDistributedCache_WhenTypeIsUnknown_Throws()
    {
        var services = new ServiceCollection();
        ISignalRServerBuilder signalRBuilder = services.AddSignalR();
        IConfiguration configuration = CreateConfiguration(DistributedCacheType.Unknown);

        InvalidOperationException exception = Assert.Throws<InvalidOperationException>(() =>
            services.AddConfiguredDistributedCache(configuration, signalRBuilder)
        );

        Assert.Contains("DistributedCacheSettings:Type", exception.Message);
    }

    [Fact]
    public void AddConfiguredDistributedCache_WhenRedisConnectionStringIsMissing_Throws()
    {
        var services = new ServiceCollection();
        ISignalRServerBuilder signalRBuilder = services.AddSignalR();
        IConfiguration configuration = CreateConfiguration(DistributedCacheType.Redis);

        InvalidOperationException exception = Assert.Throws<InvalidOperationException>(() =>
            services.AddConfiguredDistributedCache(configuration, signalRBuilder)
        );

        Assert.Contains("RedisCacheSettings:ConnectionString", exception.Message);
    }

    private static ServiceProvider BuildServices(DistributedCacheType type, string? connectionString = null)
    {
        var services = new ServiceCollection();
        ISignalRServerBuilder signalRBuilder = services.AddSignalR();
        services.AddConfiguredDistributedCache(CreateConfiguration(type, connectionString), signalRBuilder);
        return services.BuildServiceProvider();
    }

    private static IConfiguration CreateConfiguration(DistributedCacheType type, string? connectionString = null)
    {
        var values = new Dictionary<string, string?>
        {
            [$"{nameof(DistributedCacheSettings)}:{nameof(DistributedCacheSettings.Type)}"] = type.ToString(),
            [$"{nameof(RedisCacheSettings)}:{nameof(RedisCacheSettings.ConnectionString)}"] = connectionString,
            [$"{nameof(RedisCacheSettings)}:{nameof(RedisCacheSettings.InstanceName)}"] = "designer",
        };
        return new ConfigurationBuilder().AddInMemoryCollection(values).Build();
    }
}

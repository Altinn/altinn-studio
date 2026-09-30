using Altinn.App.Core.EFormidling.Configuration;
using Altinn.App.Core.EFormidling.Extensions;
using Altinn.App.Core.EFormidling.Implementation;
using Altinn.App.Core.EFormidling.Interface;
using Altinn.App.Core.Features;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Moq;

namespace Altinn.App.Core.Tests.Eformidling;

public class EFormidlingRegistrationTests
{
    private sealed class TestMetadata : IEFormidlingMetadata
    {
        public Task<(string MetadataFilename, Stream Metadata)> GenerateEFormidlingMetadata(
            IInstanceDataAccessor dataAccessor
        ) => Task.FromResult<(string, Stream)>(("arkivmelding.xml", Stream.Null));
    }

    private sealed class TestReceivers : IEFormidlingReceivers
    {
        public Task<List<EFormidling.Models.SBD.Receiver>> GetEFormidlingReceivers(
            IInstanceDataAccessor dataAccessor,
            string? receiverFromConfig
        ) => Task.FromResult(new List<EFormidling.Models.SBD.Receiver>());
    }

    private static ServiceCollection ServicesWithConfig(params (string Key, string Value)[] values)
    {
        var services = new ServiceCollection();
        services.AddAppImplementationFactory();
        IConfiguration configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(values.Select(v => new KeyValuePair<string, string?>(v.Key, v.Value)))
            .Build();
        services.AddSingleton(configuration);
        return services;
    }

    [Fact]
    public void AddEFormidling_WithMetadata_RegistersTheWholeFeature()
    {
        var services = ServicesWithConfig(("EFormidlingClientSettings:BaseUrl", "http://localhost:9093/api/"));

        services.AddEFormidling().WithMetadata<TestMetadata>();

        // The built-in implementations are asserted on the descriptors rather than resolved: they pull
        // in the rest of an app's graph, which this container deliberately does not have.
        Assert.Contains(
            services,
            d =>
                d.ServiceType == typeof(IEFormidlingService)
                && d.ImplementationType == typeof(DefaultEFormidlingService)
        );
        Assert.Contains(
            services,
            d =>
                d.ServiceType == typeof(IEFormidlingReceivers)
                && d.ImplementationType == typeof(DefaultEFormidlingReceivers)
        );

        using ServiceProvider provider = services.BuildServiceProvider();
        var factory = provider.GetRequiredService<AppImplementationFactory>();

        Assert.IsType<TestMetadata>(factory.GetRequired<IEFormidlingMetadata>());
        Assert.Equal(
            "http://localhost:9093/api/",
            provider.GetRequiredService<IOptions<EFormidlingClientSettings>>().Value.BaseUrl
        );
    }

    [Fact]
    public void WithReceivers_ReplacesTheDefault_RatherThanStackingOnIt()
    {
        var services = ServicesWithConfig();

        services.AddEFormidling().WithMetadata<TestMetadata>().WithReceivers<TestReceivers>();

        // Enumerating must not surface the default too: Replace, not Add.
        Assert.Single(services, d => d.ServiceType == typeof(IEFormidlingReceivers));

        using ServiceProvider provider = services.BuildServiceProvider();
        Assert.IsType<TestReceivers>(
            provider.GetRequiredService<AppImplementationFactory>().GetRequired<IEFormidlingReceivers>()
        );
    }

    [Fact]
    public void WithConfig_Delegate_WinsOverTheDefaultSection()
    {
        var services = ServicesWithConfig(("EFormidlingClientSettings:BaseUrl", "http://from-config/"));

        services.AddEFormidling().WithMetadata<TestMetadata>().WithConfig(o => o.BaseUrl = "http://from-code/");

        using ServiceProvider provider = services.BuildServiceProvider();
        Assert.Equal(
            "http://from-code/",
            provider.GetRequiredService<IOptions<EFormidlingClientSettings>>().Value.BaseUrl
        );
    }

    [Fact]
    public void WithConfig_SectionPath_WinsOverTheDefaultSection()
    {
        var services = ServicesWithConfig(
            ("EFormidlingClientSettings:BaseUrl", "http://from-default-section/"),
            ("MyEFormidling:BaseUrl", "http://from-named-section/")
        );

        services.AddEFormidling().WithMetadata<TestMetadata>().WithConfig("MyEFormidling");

        using ServiceProvider provider = services.BuildServiceProvider();
        Assert.Equal(
            "http://from-named-section/",
            provider.GetRequiredService<IOptions<EFormidlingClientSettings>>().Value.BaseUrl
        );
    }

    [Fact]
    public void AddEFormidling_KeepsAnEFormidlingServiceTheAppRegisteredFirst()
    {
        var services = ServicesWithConfig();
        var custom = new Mock<IEFormidlingService>().Object;
        services.AddSingleton(custom);

        services.AddEFormidling().WithMetadata<TestMetadata>();

        using ServiceProvider provider = services.BuildServiceProvider();
        Assert.Same(custom, provider.GetRequiredService<IEFormidlingService>());
    }

    [Fact]
    public void AddEFormidling_KeepsAnEFormidlingServiceTheAppRegistersAfterwards()
    {
        // The other order, and the likelier one - a custom service registered further down the app's
        // own RegisterCustomAppServices. Startup validation reads the same resolution, so both orders
        // have to agree on which implementation is the effective one.
        var services = ServicesWithConfig();
        var custom = new Mock<IEFormidlingService>().Object;

        services.AddEFormidling().WithMetadata<TestMetadata>();
        services.AddSingleton(custom);

        using ServiceProvider provider = services.BuildServiceProvider();
        Assert.Same(custom, provider.GetRequiredService<IEFormidlingService>());
    }
}

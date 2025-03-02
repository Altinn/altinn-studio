using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Options;
using Altinn.App.Core.Internal.Language;
using Altinn.App.Core.Models;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using Moq;

namespace Altinn.App.Core.Tests.Features.Options;

public class AppOptionsFactoryTests
{
    private sealed record Fixture(IServiceProvider ServiceProvider) : IDisposable
    {
        public AppOptionsFactory Factory => ServiceProvider.GetRequiredService<AppOptionsFactory>();

        public static Fixture Create(Action<IServiceCollection>? configure = null)
        {
            var services = new ServiceCollection();
            services.AddAppImplementationFactory();
            services.AddSingleton<IAppOptionsFileHandler>(new Mock<IAppOptionsFileHandler>().Object);
            services.AddSingleton<AppOptionsFactory>();
            configure?.Invoke(services);
            var serviceProvider = services.BuildStrictServiceProvider();
            return new(serviceProvider);
        }

        public void Dispose() => (ServiceProvider as IDisposable)?.Dispose();
    }

    [Fact]
    public void GetOptionsProvider_NoCustomOptionsProvider_ShouldReturnDefault()
    {
        using var fixture = Fixture.Create(services =>
            services.AddSingleton<IAppOptionsProvider, DefaultAppOptionsProvider>()
        );
        var factory = fixture.Factory;

        IAppOptionsProvider optionsProvider = factory.GetOptionsProvider("country");

        optionsProvider.Should().BeOfType<DefaultAppOptionsProvider>();
        optionsProvider.Id.Should().Be("country");
    }

    [Fact]
    public void GetOptionsProvider_NoCustomOptionsProvider_ShouldReturnDefaultTwice()
    {
        using var fixture = Fixture.Create(services =>
            services.AddSingleton<IAppOptionsProvider, DefaultAppOptionsProvider>()
        );
        var factory = fixture.Factory;

        IAppOptionsProvider optionsProvider1 = factory.GetOptionsProvider("fylke");
        IAppOptionsProvider optionsProvider2 = factory.GetOptionsProvider("kommune");

        optionsProvider1.Id.Should().Be("fylke");
        optionsProvider2.Id.Should().Be("kommune");
    }

    [Fact]
    public void GetOptionsProvider_NoDefaultProvider_ShouldThrowException()
    {
        using var fixture = Fixture.Create();
        var factory = fixture.Factory;

        System.Action action = () => factory.GetOptionsProvider("country");

        action.Should().Throw<KeyNotFoundException>();
    }

    [Fact]
    public void GetOptionsProvider_CustomOptionsProvider_ShouldReturnCustomType()
    {
        using var fixture = Fixture.Create(services =>
        {
            services.AddSingleton<IAppOptionsProvider, DefaultAppOptionsProvider>();
            services.AddSingleton<IAppOptionsProvider, CountryAppOptionsProvider>();
        });
        var factory = fixture.Factory;

        IAppOptionsProvider optionsProvider = factory.GetOptionsProvider("country");

        optionsProvider.Should().BeOfType<CountryAppOptionsProvider>();
        optionsProvider.Id.Should().Be("country");
    }

    [Fact]
    public void GetOptionsProvider_CustomOptionsProviderWithUpperCase_ShouldReturnCustomType()
    {
        using var fixture = Fixture.Create(services =>
        {
            services.AddSingleton<IAppOptionsProvider, DefaultAppOptionsProvider>();
            services.AddSingleton<IAppOptionsProvider, CountryAppOptionsProvider>();
        });
        var factory = fixture.Factory;

        IAppOptionsProvider optionsProvider = factory.GetOptionsProvider("Country");

        optionsProvider.Should().BeOfType<CountryAppOptionsProvider>();
        optionsProvider.Id.Should().Be("country");
    }

    [Fact]
    public async Task GetParameters_CustomOptionsProviderWithUpperCase_ShouldReturnCustomType()
    {
        using var fixture = Fixture.Create(services =>
        {
            services.AddSingleton<IAppOptionsProvider, DefaultAppOptionsProvider>();
            services.AddSingleton<IAppOptionsProvider, CountryAppOptionsProvider>();
        });
        var factory = fixture.Factory;

        IAppOptionsProvider optionsProvider = factory.GetOptionsProvider("Country");

        AppOptions options = await optionsProvider.GetAppOptionsAsync(
            LanguageConst.Nb,
            new Dictionary<string, string>() { { "key", "value" } }
        );
        options.Parameters.First(x => x.Key == "key").Value.Should().Be("value");
    }

    private class CountryAppOptionsProvider : IAppOptionsProvider
    {
        public string Id { get; set; } = "country";

        public Task<AppOptions> GetAppOptionsAsync(string? language, Dictionary<string, string> keyValuePairs)
        {
            var options = new AppOptions
            {
                Options = new List<AppOption>
                {
                    new AppOption { Label = "Norge", Value = "47" },
                    new AppOption { Label = "Sverige", Value = "46" },
                },

                Parameters = keyValuePairs!,
            };

            return Task.FromResult(options);
        }
    }
}

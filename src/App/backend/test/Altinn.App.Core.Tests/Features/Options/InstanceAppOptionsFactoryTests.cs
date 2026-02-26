using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Options;
using Altinn.App.Core.Models;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.App.Core.Tests.Features.Options;

public class InstanceAppOptionsFactoryTests
{
    [Fact]
    public void GetOptionsProvider_NoCustomOptionsProvider_ShouldReturnDefault()
    {
        var services = new ServiceCollection();
        services.AddAppImplementationFactory();
        services.AddSingleton<IInstanceAppOptionsProvider, VehiclesInstanceAppOptionsProvider>();
        services.AddSingleton<InstanceAppOptionsFactory>();
        using var serviceProvider = services.BuildStrictServiceProvider();

        var factory = serviceProvider.GetRequiredService<InstanceAppOptionsFactory>();

        IInstanceAppOptionsProvider? optionsProvider = factory.GetOptionsProvider("not-vehicles");

        optionsProvider.Should().Be(null);
    }

    [Fact]
    public void GetOptionsProvider_CustomOptionsProvider_ShouldReturnCustomType()
    {
        var services = new ServiceCollection();
        services.AddAppImplementationFactory();
        services.AddSingleton<IInstanceAppOptionsProvider, VehiclesInstanceAppOptionsProvider>();
        services.AddSingleton<InstanceAppOptionsFactory>();
        using var serviceProvider = services.BuildStrictServiceProvider();

        var factory = serviceProvider.GetRequiredService<InstanceAppOptionsFactory>();
        IInstanceAppOptionsProvider? optionsProvider = factory.GetOptionsProvider("vehicles");

        optionsProvider.Should().BeOfType<VehiclesInstanceAppOptionsProvider>();
        optionsProvider.Id.Should().Be("vehicles");
    }

    public class VehiclesInstanceAppOptionsProvider : IInstanceAppOptionsProvider
    {
        public string Id => "vehicles";

        public Task<AppOptions> GetInstanceAppOptionsAsync(
            InstanceIdentifier instanceIdentifier,
            string? language,
            Dictionary<string, string> keyValuePairs
        )
        {
            var options = new AppOptions
            {
                Options = new List<AppOption>
                {
                    new() { Label = "Skoda Octavia 1.6", Value = "DN49525" },
                    new() { Label = "e-Golf", Value = "EK38470" },
                    new() { Label = "Tilhenger", Value = "JT5817" },
                },
            };

            return Task.FromResult(options);
        }
    }
}

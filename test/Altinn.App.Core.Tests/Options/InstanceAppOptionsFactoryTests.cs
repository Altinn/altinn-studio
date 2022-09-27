using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Options;
using Altinn.App.Core.Models;
using FluentAssertions;
using Xunit;

namespace Altinn.App.PlatformServices.Tests.Options
{
    public class InstanceAppOptionsFactoryTests
    {
        [Fact]
        public void GetOptionsProvider_NoCustomOptionsProvider_ShouldReturnDefault()
        {
            var factory = new InstanceAppOptionsFactory(new List<IInstanceAppOptionsProvider>() { new VehiclesInstanceAppOptionsProvider() });

            IInstanceAppOptionsProvider optionsProvider = factory.GetOptionsProvider("not-vehicles");

            optionsProvider.Should().BeOfType<NullInstanceAppOptionsProvider>();
        }

        [Fact]
        public void GetOptionsProvider_CustomOptionsProvider_ShouldReturnCustomType()
        {
            var factory = new InstanceAppOptionsFactory(new List<IInstanceAppOptionsProvider>() { new VehiclesInstanceAppOptionsProvider() });

            IInstanceAppOptionsProvider optionsProvider = factory.GetOptionsProvider("vehicles");

            optionsProvider.Should().BeOfType<VehiclesInstanceAppOptionsProvider>();
            optionsProvider.Id.Should().Be("vehicles");
        }

        public class VehiclesInstanceAppOptionsProvider : IInstanceAppOptionsProvider
        {
            public string Id => "vehicles";

            public Task<AppOptions> GetInstanceAppOptionsAsync(InstanceIdentifier instanceIdentifier, string language, Dictionary<string, string> keyValuePairs)
            {
                var options = new AppOptions
                {
                    Options = new List<AppOption>
                    {
                        new AppOption
                        {
                            Label = "Skoda Octavia 1.6",
                            Value = "DN49525"
                        },
                        new AppOption
                        {
                            Label = "e-Golf",
                            Value = "EK38470"
                        },
                        new AppOption
                        {
                            Label = "Tilhenger",
                            Value = "JT5817"
                        }
                    }
                };

                return Task.FromResult(options);
            }
        }
    }
}

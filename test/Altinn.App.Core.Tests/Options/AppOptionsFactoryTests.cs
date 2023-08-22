using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Options;
using Altinn.App.Core.Models;
using FluentAssertions;
using Moq;
using Xunit;

namespace Altinn.App.PlatformServices.Tests.Options
{
    public class AppOptionsFactoryTests
    {
        [Fact]
        public void GetOptionsProvider_NoCustomOptionsProvider_ShouldReturnDefault()
        {
            var appOptionsFileHandler = new Mock<IAppOptionsFileHandler>();
            var factory = new AppOptionsFactory(new List<IAppOptionsProvider>() { new DefaultAppOptionsProvider(appOptionsFileHandler.Object) });

            IAppOptionsProvider optionsProvider = factory.GetOptionsProvider("country");

            optionsProvider.Should().BeOfType<DefaultAppOptionsProvider>();
            optionsProvider.Id.Should().Be("country");
        }

        [Fact]
        public void GetOptionsProvider_NoCustomOptionsProvider_ShouldReturnDefaultTwice()
        {
            var appOptionsFileHandler = new Mock<IAppOptionsFileHandler>();
            var factory = new AppOptionsFactory(new List<IAppOptionsProvider>() { new DefaultAppOptionsProvider(appOptionsFileHandler.Object) });

            IAppOptionsProvider optionsProvider1 = factory.GetOptionsProvider("fylke");
            IAppOptionsProvider optionsProvider2 = factory.GetOptionsProvider("kommune");
            
            optionsProvider1.Id.Should().Be("fylke");
            optionsProvider2.Id.Should().Be("kommune");
        }

        [Fact]
        public void GetOptionsProvider_NoDefaultProvider_ShouldThrowException()
        {
            var factory = new AppOptionsFactory(new List<IAppOptionsProvider>());

            Action action = () => factory.GetOptionsProvider("country");

            action.Should().Throw<KeyNotFoundException>();
        }

        [Fact]
        public void GetOptionsProvider_CustomOptionsProvider_ShouldReturnCustomType()
        {
            var appOptionsFileHandler = new Mock<IAppOptionsFileHandler>();
            var factory = new AppOptionsFactory(new List<IAppOptionsProvider>() { new DefaultAppOptionsProvider(appOptionsFileHandler.Object), new CountryAppOptionsProvider() });

            IAppOptionsProvider optionsProvider = factory.GetOptionsProvider("country");

            optionsProvider.Should().BeOfType<CountryAppOptionsProvider>();
            optionsProvider.Id.Should().Be("country");
        }

        [Fact]
        public void GetOptionsProvider_CustomOptionsProviderWithUpperCase_ShouldReturnCustomType()
        {
            var appOptionsFileHandler = new Mock<IAppOptionsFileHandler>();
            var factory = new AppOptionsFactory(new List<IAppOptionsProvider>() { new DefaultAppOptionsProvider(appOptionsFileHandler.Object), new CountryAppOptionsProvider() });

            IAppOptionsProvider optionsProvider = factory.GetOptionsProvider("Country");

            optionsProvider.Should().BeOfType<CountryAppOptionsProvider>();
            optionsProvider.Id.Should().Be("country");
        }

        [Fact]
        public async Task GetParameters_CustomOptionsProviderWithUpperCase_ShouldReturnCustomType()
        {
            var appOptionsFileHandler = new Mock<IAppOptionsFileHandler>();
            var factory = new AppOptionsFactory(new List<IAppOptionsProvider>() { new DefaultAppOptionsProvider(appOptionsFileHandler.Object), new CountryAppOptionsProvider() });

            IAppOptionsProvider optionsProvider = factory.GetOptionsProvider("Country");

            AppOptions options = await optionsProvider.GetAppOptionsAsync("nb", new Dictionary<string, string>() { { "key", "value" } });
            options.Parameters.First(x => x.Key == "key").Value.Should().Be("value");
        }

        internal class CountryAppOptionsProvider : IAppOptionsProvider
        {
            public string Id { get; set; } = "country";

            public Task<AppOptions> GetAppOptionsAsync(string language, Dictionary<string, string> keyValuePairs)
            {
                var options = new AppOptions
                {
                    Options = new List<AppOption>
                    {
                        new AppOption
                        {
                            Label = "Norge",
                            Value = "47"
                        },
                        new AppOption
                        {
                            Label = "Sverige",
                            Value = "46"
                        }
                    },

                    Parameters = keyValuePairs
                };

                return Task.FromResult(options);
            }
        }
    }
}

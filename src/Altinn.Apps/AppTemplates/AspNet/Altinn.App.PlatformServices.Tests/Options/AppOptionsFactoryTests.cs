using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.App.Common.Models;
using Altinn.App.PlatformServices.Options;
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

        internal class CountryAppOptionsProvider : IAppOptionsProvider
        {
            public string Id { get; set; } = "country";

            public Task<AppOptions> GetAppOptionsAsync(Dictionary<string, string> keyValuePairs)
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
                    }
                };

                return Task.FromResult(options);
            }
        }
    }
}

using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Options;
using Altinn.Codelists.AdministrativeUnits.Extensions;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using System.Collections.Generic;
using Xunit;

namespace Altinn.Codelists.Tests.AdministrativeUnits.Extensions
{
    public class ServiceCollectionTests
    {
        [Fact]
        public void AddAdministrativeUnits_ShouldResolveAppOptionProviders()
        {
            var services = new ServiceCollection();
            services.AddAdministrativeUnits();
            var provider = services.BuildServiceProvider();

            IEnumerable<IAppOptionsProvider> appOptionsServices = provider.GetServices<IAppOptionsProvider>();

            appOptionsServices.Should().HaveCount(2);
        }
    }
}

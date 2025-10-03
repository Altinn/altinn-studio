using Altinn.App.Core.Features;
using Altinn.Codelists.Kartverket.AdministrativeUnits.Extensions;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.Codelists.Tests.Kartverket.AdministrativeUnits.Extensions;

public class ServiceCollectionTests
{
    [Fact]
    public void AddAdministrativeUnits_ShouldResolveAppOptionProviders()
    {
        var services = new ServiceCollection();
        services.AddKartverketAdministrativeUnits();
        var provider = services.BuildServiceProvider();

        IEnumerable<IAppOptionsProvider> appOptionsServices = provider.GetServices<IAppOptionsProvider>();

        Assert.Equal(2, appOptionsServices.Count());
    }
}

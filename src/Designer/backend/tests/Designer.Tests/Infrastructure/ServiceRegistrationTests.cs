using System;
using Altinn.Studio.Designer.Infrastructure;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace Designer.Tests.Infrastructure;

public class ServiceRegistrationTests
{
    [Fact]
    public void RegisterServiceImplementations_RegistersSystemTimeProvider()
    {
        IConfiguration configuration = new ConfigurationBuilder().Build();
        var services = new ServiceCollection();

        services.RegisterServiceImplementations(configuration);
        using ServiceProvider provider = services.BuildServiceProvider();

        Assert.Same(TimeProvider.System, provider.GetRequiredService<TimeProvider>());
    }
}

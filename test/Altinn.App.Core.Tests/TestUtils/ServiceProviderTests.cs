using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.App.Core.Tests.TestUtils;

public class ServiceProviderTests
{
    private readonly IServiceCollection _serviceProvider = new ServiceCollection();

    protected class ParentService(IServiceProvider serviceProvider)
    {
        public SingletonService SingletonService => serviceProvider.GetRequiredService<SingletonService>();
        public ScopedService ScopedService => serviceProvider.GetRequiredService<ScopedService>();
    }

    protected class ScopedService(IServiceProvider serviceProvider) : ParentService(serviceProvider) { }

    protected class SingletonService(IServiceProvider serviceProvider) : ParentService(serviceProvider) { }

    public ServiceProviderTests()
    {
        _serviceProvider.AddSingleton<SingletonService>();
        _serviceProvider.AddScoped<ScopedService>();
    }

    [Fact]
    public void TestServices()
    {
        using var serviceProvider = _serviceProvider.BuildServiceProvider(
            new ServiceProviderOptions() { ValidateScopes = true, ValidateOnBuild = true }
        );
        // var singletonService = serviceProvider.GetRequiredService<SingletonService>();
        // var scopedRootService = singletonService.ScopedService;


        using var scope = serviceProvider.CreateScope();
        var scopedService = scope.ServiceProvider.GetRequiredService<ScopedService>();
        scopedService.Should().NotBeNull();
        scopedService.ScopedService.Should().Be(scopedService);

        using var scope2 = serviceProvider.CreateScope();
        var scopedService2 = scope2.ServiceProvider.GetRequiredService<ScopedService>();
        scopedService2.Should().NotBe(scopedService);
        scopedService2.ScopedService.Should().Be(scopedService2);
        var action = () => scopedService.SingletonService.ScopedService;
        action.Should().Throw<InvalidOperationException>();
    }
}

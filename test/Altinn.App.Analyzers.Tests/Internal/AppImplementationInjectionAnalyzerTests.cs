using Altinn.App.Analyzers.Tests.Fixtures;
using Altinn.App.Internal.Analyzers;
using Xunit.Abstractions;

namespace Altinn.App.Analyzers.Tests.Internal;

[Collection(nameof(AltinnAppCoreCollection))]
public class AppImplementationInjectionAnalyzerTests : IAsyncLifetime
{
    private readonly AltinnAppCoreFixture _fixture;

    public AppImplementationInjectionAnalyzerTests(AltinnAppCoreFixture fixture, ITestOutputHelper output)
    {
        fixture.SetTestOutputHelper(output);
        _fixture = fixture;
    }

    public async Task InitializeAsync() => await _fixture.Initialize();

    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public async Task Builds_Ok_By_Default()
    {
        using var cts = new CancellationTokenSource(TimeSpan.FromMinutes(1));
        var cancellationToken = cts.Token;

        var analyzer = new AppImplementationInjectionAnalyzer();

        var (compilation, diagnostics) = await _fixture.GetCompilation(analyzer, cancellationToken);

        Assert.Empty(diagnostics);
    }

    [Fact]
    public async Task Emits_Diagnostics()
    {
        using var cts = new CancellationTokenSource(TimeSpan.FromMinutes(1));
        var cancellationToken = cts.Token;

        var analyzer = new AppImplementationInjectionAnalyzer();

        using var _ = _fixture.WithCode(
            """
                using Altinn.App.Core.Features;
                using Microsoft.Extensions.DependencyInjection;

                internal sealed class Svc1
                {
                    private readonly IServiceProvider _sp;
                    private readonly AppImplementationFactory _factory;

                    public Svc1(
                        IServiceProvider sp,
                        AppImplementationFactory factory,
                        IInstantiationProcessor p, // X Constructor injection
                        IEnumerable<IInstantiationProcessor> ps, // X Constructor injection
                        IInstantiationProcessor? np = null // X Constructor injection
                    )
                    {
                        _sp = sp;
                        _factory = factory;
                        _ = factory.Get<IInstantiationProcessor>(); // X Constructor injection
                        _ = sp.GetService<IInstantiationProcessor>(); // X Constructor injection, IServiceProvider
                        _ = sp.GetService(typeof(IInstantiationProcessor)); // X Constructor injection, IServiceProvider
                        _ = sp.GetServices<IInstantiationProcessor>(); // X Constructor injection, IServiceProvider
                        _ = sp.GetServices(typeof(IInstantiationProcessor)); // X Constructor injection, IServiceProvider
                        _ = factory.Get<IServiceProvider>(); // X AppImplementationFactory -> IServiceProvider
                    }
                }

                internal sealed class Svc2(
                    IServiceProvider sp,
                    AppImplementationFactory factory,
                    IInstantiationProcessor p,
                    IEnumerable<IInstantiationProcessor> ps,
                    IInstantiationProcessor? np = null
                )
                {
                    private readonly IServiceProvider _sp = sp;
                    private readonly AppImplementationFactory _factory = factory;

                    private object? _f1 = factory.Get<IInstantiationProcessor>(); // X Initialization
                    private object? _f2 = sp.GetService<IInstantiationProcessor>(); // X Initialization, IServiceProvider
                    private object? _f3 = sp.GetService(typeof(IInstantiationProcessor)); // X Initialization, IServiceProvider
                    private object? _f4 = sp.GetServices<IInstantiationProcessor>(); // X Initialization, IServiceProvider
                    private object? _f5 = sp.GetServices(typeof(IInstantiationProcessor)); // X Initialization, IServiceProvider
                    private object? _f6 = factory.Get<IServiceProvider>(); // X AppImplementationFactory -> IServiceProvider

                    private object? _p1 { get; } = factory.Get<IInstantiationProcessor>(); // X Initialization
                    private object? _p2 { get; } = sp.GetService<IInstantiationProcessor>(); // X Initialization, IServiceProvider
                    private object? _p3 { get; } = sp.GetService(typeof(IInstantiationProcessor)); // X Initialization, IServiceProvider
                    private object? _p4 { get; } = sp.GetServices<IInstantiationProcessor>(); // X Initialization, IServiceProvider
                    private object? _p5 { get; } = sp.GetServices(typeof(IInstantiationProcessor)); // X Initialization, IServiceProvider
                    private object? _p6 { get; } = factory.Get<IServiceProvider>(); // X AppImplementationFactory -> IServiceProvider

                    private object? _ok1 => factory.Get<IInstantiationProcessor>(); // OK
                    private object? _ok2 => _factory.Get<IInstantiationProcessor>(); // OK

                    public void Ok()
                    {
                        _ = _factory.Get<IInstantiationProcessor>(); // OK
                    }
                }
            """
        );

        var (compilation, diagnostics) = await _fixture.GetCompilation(analyzer, cancellationToken);

        await Verify(diagnostics);
    }
}

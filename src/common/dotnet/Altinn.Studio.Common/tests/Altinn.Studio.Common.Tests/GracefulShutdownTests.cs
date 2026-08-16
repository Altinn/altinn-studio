using System;
using System.IO;
using System.Runtime.InteropServices;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Time.Testing;
using Xunit;
using XunitAssert = Xunit.Assert;

namespace Altinn.Studio.Common.Tests;

public sealed class GracefulShutdownTests
{
    [Fact]
    public void ProfileRejectsNegativeEndpointDrainDelay()
    {
        XunitAssert.Throws<ArgumentOutOfRangeException>(() =>
            new GracefulShutdownProfile(TimeSpan.FromSeconds(-1), TimeSpan.FromSeconds(20))
        );
    }

    [Fact]
    public void ProfileRejectsNonPositiveApplicationShutdownTimeout()
    {
        XunitAssert.Throws<ArgumentOutOfRangeException>(() =>
            new GracefulShutdownProfile(TimeSpan.FromSeconds(5), TimeSpan.Zero)
        );
    }

    [Fact]
    public void GracefulShutdownUsesTheProjectProfile()
    {
        var environment = new TestHostEnvironment(Environments.Production);
        using var applicationLifetime = new TestApplicationLifetime();
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddSingleton<IHostEnvironment>(environment);
        services.AddSingleton<IHostApplicationLifetime>(applicationLifetime);

        services.AddGracefulShutdown(environment, TimeSpan.FromSeconds(7), TimeSpan.FromSeconds(18));

        using var serviceProvider = services.BuildServiceProvider();
        var hostOptions = serviceProvider.GetRequiredService<IOptions<HostOptions>>().Value;
        XunitAssert.Equal(TimeSpan.FromSeconds(18), hostOptions.ShutdownTimeout);
        XunitAssert.IsType<AppHostLifetime>(serviceProvider.GetRequiredService<IHostLifetime>());
    }

    [Fact]
    public async Task RepeatedSignalsScheduleShutdownOnce()
    {
        var timeProvider = new FakeTimeProvider();
        using var applicationLifetime = new TestApplicationLifetime();
        using var lifetime = new AppHostLifetime(
            NullLogger<AppHostLifetime>.Instance,
            new TestHostEnvironment(Environments.Production),
            applicationLifetime,
            timeProvider,
            TimeSpan.FromSeconds(5)
        );

        lifetime.ScheduleShutdown(PosixSignal.SIGTERM);
        lifetime.ScheduleShutdown(PosixSignal.SIGINT);
        XunitAssert.Equal(0, applicationLifetime.StopCallCount);

        timeProvider.Advance(TimeSpan.FromSeconds(5));
        await applicationLifetime.Stopped.WaitAsync(TimeSpan.FromSeconds(1), TestContext.Current.CancellationToken);

        XunitAssert.Equal(1, applicationLifetime.StopCallCount);
    }

    private sealed class TestHostEnvironment(string environmentName) : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = environmentName;
        public string ApplicationName { get; set; } = nameof(Altinn.Studio.Common.Tests);
        public string ContentRootPath { get; set; } = Directory.GetCurrentDirectory();
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }

    private sealed class TestApplicationLifetime : IHostApplicationLifetime, IDisposable
    {
        private readonly CancellationTokenSource _stopping = new();
        private readonly TaskCompletionSource _stopped = new(TaskCreationOptions.RunContinuationsAsynchronously);
        private int _stopCallCount;

        public CancellationToken ApplicationStarted => CancellationToken.None;
        public CancellationToken ApplicationStopping => _stopping.Token;
        public CancellationToken ApplicationStopped => CancellationToken.None;
        public int StopCallCount => Volatile.Read(ref _stopCallCount);
        public Task Stopped => _stopped.Task;

        public void StopApplication()
        {
            Interlocked.Increment(ref _stopCallCount);
            _stopping.Cancel();
            _stopped.TrySetResult();
        }

        public void Dispose() => _stopping.Dispose();
    }
}

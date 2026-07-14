using System.Collections.Concurrent;
using Altinn.Studio.AppConfig.Validation.Schemas;
using Xunit;

namespace Altinn.Studio.AppConfigLsp.Tests;

public sealed class SchemaSetLoaderTests
{
    private sealed class ControlledLoads
    {
        private readonly ConcurrentQueue<(string Version, TaskCompletionSource<SchemaSet?> Completion)> _pending =
            new();

        public List<string> Requested { get; } = new();

        public Task<SchemaSet?> Load(string version)
        {
            var completion = new TaskCompletionSource<SchemaSet?>(TaskCreationOptions.RunContinuationsAsynchronously);
            lock (Requested)
                Requested.Add(version);
            _pending.Enqueue((version, completion));
            return completion.Task;
        }

        public void Complete(string version, SchemaSet? result)
        {
            Assert.True(_pending.TryDequeue(out var load));
            Assert.Equal(version, load.Version);
            load.Completion.SetResult(result);
        }
    }

    private static SchemaSet Set() => SchemaSet.FromFiles(new Dictionary<string, string>(StringComparer.Ordinal));

    private static (SchemaSetLoader Loader, ControlledLoads Loads, object Sync, ManualResetEventSlim Loaded) Setup()
    {
        var sync = new object();
        var loads = new ControlledLoads();
        var loaded = new ManualResetEventSlim();
        var loader = new SchemaSetLoader(sync, loads.Load, loaded.Set, new Logger(LogLevel.Error));
        return (loader, loads, sync, loaded);
    }

    private static void WaitFor(Func<bool> condition)
    {
        Assert.True(SpinWait.SpinUntil(condition, TimeSpan.FromSeconds(5)));
    }

    [Fact]
    public void VersionChangeDuringLoad_LoadsTheNewVersion()
    {
        var (loader, loads, sync, loaded) = Setup();
        var setB = Set();

        lock (sync)
            loader.Observe("A");
        WaitFor(() => loads.Requested.Count == 1);
        lock (sync)
            loader.Observe("B");

        loads.Complete("A", Set());
        WaitFor(() => loads.Requested.Count == 2);
        string[] expectedAB = ["A", "B"];
        Assert.Equal(expectedAB, loads.Requested);
        Assert.Null(loader.Current);

        loads.Complete("B", setB);
        Assert.True(loaded.Wait(TimeSpan.FromSeconds(5)));
        Assert.Same(setB, loader.Current);
    }

    [Fact]
    public void FailedLoad_RetriesAfterReset()
    {
        var (loader, loads, sync, loaded) = Setup();
        var set = Set();

        lock (sync)
            loader.Observe("A");
        WaitFor(() => loads.Requested.Count == 1);
        loads.Complete("A", null);
        WaitFor(() => !loader.Loading);

        lock (sync)
            loader.Observe("A");
        Assert.Single(loads.Requested);

        lock (sync)
        {
            loader.ResetFailure();
            loader.Observe("A");
        }
        WaitFor(() => loads.Requested.Count == 2);
        loads.Complete("A", set);
        Assert.True(loaded.Wait(TimeSpan.FromSeconds(5)));
        Assert.Same(set, loader.Current);
    }

    [Fact]
    public void FailureMarker_IsClearedBySuccessOfAnotherVersion()
    {
        var (loader, loads, sync, loaded) = Setup();

        lock (sync)
            loader.Observe("A");
        WaitFor(() => loads.Requested.Count == 1);
        loads.Complete("A", null);
        WaitFor(() => !loader.Loading);

        lock (sync)
            loader.Observe("B");
        WaitFor(() => loads.Requested.Count == 2);
        loads.Complete("B", Set());
        Assert.True(loaded.Wait(TimeSpan.FromSeconds(5)));
        WaitFor(() => loader.Current is not null);

        lock (sync)
            loader.Observe("A");
        WaitFor(() => loads.Requested.Count == 3);
        string[] expectedABA = ["A", "B", "A"];
        Assert.Equal(expectedABA, loads.Requested);

        var setA = Set();
        loads.Complete("A", setA);
        WaitFor(() => ReferenceEquals(loader.Current, setA));
    }

    [Fact]
    public void NullVersion_ClearsCurrentWithoutLoading()
    {
        var (loader, loads, sync, loaded) = Setup();

        lock (sync)
            loader.Observe("A");
        WaitFor(() => loads.Requested.Count == 1);
        loads.Complete("A", Set());
        Assert.True(loaded.Wait(TimeSpan.FromSeconds(5)));
        WaitFor(() => loader.Current is not null);

        lock (sync)
            loader.Observe(null);
        Assert.Null(loader.Current);
        Assert.Single(loads.Requested);
    }
}

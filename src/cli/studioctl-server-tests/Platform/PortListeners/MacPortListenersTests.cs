using System.Net;
using System.Net.Sockets;
using Altinn.Studio.StudioctlServer.Platform.PortListeners;

namespace Studioctl.Tests.Platform.PortListeners;

public sealed class MacPortListenersTests
{
    [Fact]
    public async Task Get_ReadsListenersPerProcess()
    {
        var commands = new FakeCommands(
            """
            p1001
            ceditor
            f48
            n127.0.0.1:6001
            p1002
            cmediaplayer
            f81
            n127.0.0.1:6002
            f95
            n*:6003
            p7788
            cdotnet
            f200
            n[::1]:5005
            f201
            n[::]:5006
            f202
            n192.168.1.10:5007
            f203
            n127.0.0.1:5008->127.0.0.1:60123
            f204
            n*:*
            """
        );
        commands.CommandLines[7788] = "dotnet App.dll";

        var listeners = await new MacPortListeners(commands.Run).Get(TestContext.Current.CancellationToken);

        Assert.Equal(
            [
                new PortListener(1001, 6001, ListenerBindScope.Loopback, "editor", "command 1001"),
                new PortListener(1002, 6002, ListenerBindScope.Loopback, "mediaplayer", "command 1002"),
                new PortListener(1002, 6003, ListenerBindScope.Any, "mediaplayer", "command 1002"),
                new PortListener(7788, 5005, ListenerBindScope.Loopback, "dotnet", "dotnet App.dll"),
                new PortListener(7788, 5006, ListenerBindScope.Any, "dotnet", "dotnet App.dll"),
                new PortListener(7788, 5007, ListenerBindScope.Specific, "dotnet", "dotnet App.dll"),
            ],
            listeners.OrderBy(static listener => listener.ProcessId).ThenBy(static listener => listener.Port)
        );
    }

    [Fact]
    public async Task Get_DeduplicatesDualStackSockets()
    {
        var commands = new FakeCommands(
            """
            p7788
            cdotnet
            f200
            n*:5005
            f201
            n*:5005
            """
        );

        var listener = Assert.Single(
            await new MacPortListeners(commands.Run).Get(TestContext.Current.CancellationToken)
        );
        Assert.Equal(new PortListener(7788, 5005, ListenerBindScope.Any, "dotnet", "command 7788"), listener);
    }

    [Fact]
    public async Task Get_WhenLsofFindsNothing_ReturnsNoListeners()
    {
        var commands = new FakeCommands(lsofOutput: string.Empty, lsofExitCode: 1);

        Assert.Empty(await new MacPortListeners(commands.Run).Get(TestContext.Current.CancellationToken));
        Assert.Empty(commands.CommandLineLookups);
    }

    [Fact]
    public async Task Get_WhenLsofFails_Throws()
    {
        var commands = new FakeCommands(lsofOutput: string.Empty, lsofExitCode: 1, lsofError: "lsof: not permitted");

        var exception = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            new MacPortListeners(commands.Run).Get(TestContext.Current.CancellationToken)
        );
        Assert.Contains("lsof: not permitted", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Get_LooksUpCommandLineOncePerLiveProcess()
    {
        var commands = new FakeCommands(
            """
            p1001
            ceditor
            f48
            n127.0.0.1:6001
            p7788
            cdotnet
            f200
            n*:5005
            """
        );
        var listeners = new MacPortListeners(commands.Run);

        await listeners.Get(TestContext.Current.CancellationToken);
        await listeners.Get(TestContext.Current.CancellationToken);
        Assert.Equal([1001, 7788], commands.CommandLineLookups.Order());

        commands.LsofOutput = """
            p7788
            cdotnet
            f200
            n*:5005
            """;
        await listeners.Get(TestContext.Current.CancellationToken);
        commands.LsofOutput = """
            p1001
            ceditor
            f48
            n127.0.0.1:6001
            p7788
            cdotnet
            f200
            n*:5005
            """;
        await listeners.Get(TestContext.Current.CancellationToken);

        Assert.Equal([1001, 1001, 7788], commands.CommandLineLookups.Order());
    }

    [Fact]
    public async Task Get_RetriesBlankCommandLineOnNextPoll()
    {
        var commands = new FakeCommands(
            """
            p7788
            cdotnet
            f200
            n*:5005
            """
        );
        commands.CommandLines[7788] = string.Empty;
        var listeners = new MacPortListeners(commands.Run);

        var listener = Assert.Single(await listeners.Get(TestContext.Current.CancellationToken));
        Assert.Null(listener.CommandLine);

        commands.CommandLines[7788] = "dotnet App.dll";
        listener = Assert.Single(await listeners.Get(TestContext.Current.CancellationToken));
        Assert.Equal("dotnet App.dll", listener.CommandLine);
        Assert.Equal([7788, 7788], commands.CommandLineLookups);
    }

    [Fact(Skip = "requires macOS lsof", SkipUnless = nameof(IsMacOS), SkipType = typeof(MacPortListenersTests))]
    public async Task Get_DiscoversListenerOwnedByCurrentProcess()
    {
        using var socket = new TcpListener(IPAddress.Loopback, 0);
        socket.Start();
        var port = ((IPEndPoint)socket.LocalEndpoint).Port;

        var listeners = await new MacPortListeners().Get(TestContext.Current.CancellationToken);

        var listener = Assert.Single(
            listeners,
            listener => listener.ProcessId == Environment.ProcessId && listener.Port == port
        );
        Assert.Equal(ListenerBindScope.Loopback, listener.BindScope);
        Assert.False(string.IsNullOrEmpty(listener.ProcessName));
        Assert.False(string.IsNullOrEmpty(listener.CommandLine));
    }

    public static bool IsMacOS => OperatingSystem.IsMacOS();

    private sealed class FakeCommands(string lsofOutput, int lsofExitCode = 0, string lsofError = "")
    {
        public string LsofOutput { get; set; } = lsofOutput;
        public Dictionary<int, string> CommandLines { get; } = [];
        public List<int> CommandLineLookups { get; } = [];

        public Task<MacPortListeners.CommandResult> Run(
            string fileName,
            string arguments,
            CancellationToken cancellationToken
        )
        {
            cancellationToken.ThrowIfCancellationRequested();
            if (fileName == "lsof")
                return Task.FromResult(new MacPortListeners.CommandResult(lsofExitCode, LsofOutput, lsofError));

            Assert.Equal("ps", fileName);
            var processId = int.Parse(arguments.Split(' ')[1], System.Globalization.CultureInfo.InvariantCulture);
            CommandLineLookups.Add(processId);
            var commandLine = CommandLines.GetValueOrDefault(processId, $"command {processId}");
            return Task.FromResult(new MacPortListeners.CommandResult(0, commandLine, string.Empty));
        }
    }
}

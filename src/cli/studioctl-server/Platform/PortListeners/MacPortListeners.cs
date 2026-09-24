using System.Globalization;

namespace Altinn.Studio.StudioctlServer.Platform.PortListeners;

internal sealed class MacPortListeners(MacPortListeners.CommandRunner runCommand) : IPortListenerSource
{
    private const string LsofArguments = "-Fpcn -nPw -iTCP -sTCP:LISTEN";
    private readonly Dictionary<int, string> _commandLines = [];

    public MacPortListeners()
        : this(RunProcess) { }

    public bool SupportsCurrentPlatform() => OperatingSystem.IsMacOS();

    public async Task<IReadOnlyList<PortListener>> Get(CancellationToken cancellationToken)
    {
        var output = await RunLsof(cancellationToken);
        var bindings = ParseLsofOutput(output);
        if (bindings.Count == 0)
        {
            _commandLines.Clear();
            return [];
        }

        var listeners = new List<PortListener>(bindings.Count);
        foreach (var binding in bindings)
        {
            var commandLine = await ReadCommandLine(binding.ProcessId, cancellationToken);
            listeners.Add(
                new PortListener(binding.ProcessId, binding.Port, binding.BindScope, binding.ProcessName, commandLine)
            );
        }

        PruneCommandLines(bindings);

        return [.. listeners.Distinct()];
    }

    private static IReadOnlyList<MacListenerBinding> ParseLsofOutput(string output)
    {
        var bindings = new HashSet<MacListenerBinding>();
        var processName = string.Empty;
        var processId = 0;
        foreach (var line in output.Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
        {
            var field = line[0];
            var value = line.AsSpan(1);

            switch (field)
            {
                case 'p':
                    processName = string.Empty;
                    if (!int.TryParse(value, CultureInfo.InvariantCulture, out processId))
                        processId = 0;
                    break;
                case 'c':
                    processName = value.ToString();
                    break;
                case 'n':
                    if (processId == 0 || value.Contains("->", StringComparison.Ordinal))
                        continue;

                    if (!TryParseListener(value, out var port, out var bindScope))
                        continue;

                    bindings.Add(new MacListenerBinding(processId, port, bindScope, processName));
                    break;
            }
        }

        return [.. bindings];
    }

    private static bool TryParseListener(ReadOnlySpan<char> addressField, out int port, out ListenerBindScope bindScope)
    {
        port = 0;
        bindScope = default;
        var spaceIndex = addressField.IndexOf(' ');
        if (spaceIndex >= 0)
            addressField = addressField[..spaceIndex];

        var separatorIndex = addressField.LastIndexOf('.');
        var colonIndex = addressField.LastIndexOf(':');
        if (colonIndex > separatorIndex)
            separatorIndex = colonIndex;

        if (separatorIndex < 0)
            return false;

        var hostField = UnwrapIpv6Literal(addressField[..separatorIndex]);
        var portField = addressField[(separatorIndex + 1)..];
        if (portField.Equals("*", StringComparison.Ordinal))
            return false;

        if (!int.TryParse(portField, CultureInfo.InvariantCulture, out port))
            return false;

        bindScope = ClassifyBindScope(hostField);
        return true;
    }

    private static ListenerBindScope ClassifyBindScope(ReadOnlySpan<char> hostField)
    {
        if (
            hostField.Equals("*", StringComparison.Ordinal)
            || hostField.Equals("0.0.0.0", StringComparison.Ordinal)
            || hostField.Equals("::", StringComparison.Ordinal)
        )
            return ListenerBindScope.Any;

        if (
            hostField.Equals("127.0.0.1", StringComparison.Ordinal)
            || hostField.Equals("::1", StringComparison.Ordinal)
            || hostField.Equals("localhost", StringComparison.OrdinalIgnoreCase)
        )
            return ListenerBindScope.Loopback;

        return ListenerBindScope.Specific;
    }

    private static ReadOnlySpan<char> UnwrapIpv6Literal(ReadOnlySpan<char> hostField)
    {
        if (hostField.Length >= 2 && hostField[0] == '[' && hostField[^1] == ']')
            return hostField[1..^1];

        return hostField;
    }

    private async Task<string?> ReadCommandLine(int processId, CancellationToken cancellationToken)
    {
        if (_commandLines.TryGetValue(processId, out var cached))
            return cached;

        var result = await runCommand("ps", $"-p {processId} -o command=", cancellationToken);
        if (result.ExitCode != 0)
            return null;

        var commandLine = result.StandardOutput.Trim();
        if (commandLine.Length == 0)
            return null;

        _commandLines[processId] = commandLine;
        return commandLine;
    }

    private void PruneCommandLines(IReadOnlyList<MacListenerBinding> bindings)
    {
        var activeProcessIds = bindings.Select(static binding => binding.ProcessId).ToHashSet();
        foreach (var processId in _commandLines.Keys.ToArray())
            if (!activeProcessIds.Contains(processId))
                _commandLines.Remove(processId);
    }

    private async Task<string> RunLsof(CancellationToken cancellationToken)
    {
        var result = await runCommand("lsof", LsofArguments, cancellationToken);
        if (result.ExitCode != 0 && result.StandardOutput.Length == 0)
        {
            if (result.StandardError.Length == 0)
                return string.Empty;

            throw new InvalidOperationException($"command 'lsof {LsofArguments}' failed: {result.StandardError}");
        }

        return result.StandardOutput;
    }

    private static async Task<CommandResult> RunProcess(
        string fileName,
        string arguments,
        CancellationToken cancellationToken
    )
    {
        using var process = new System.Diagnostics.Process
        {
            StartInfo = ProcessUtil.CreateStartInfo(fileName, arguments),
        };
        process.StartInfo.RedirectStandardOutput = true;
        process.StartInfo.RedirectStandardError = true;

        process.Start();
        var stdout = process.StandardOutput.ReadToEndAsync(cancellationToken);
        var stderr = process.StandardError.ReadToEndAsync(cancellationToken);
        await process.WaitForExitAsync(cancellationToken);

        return new CommandResult(process.ExitCode, await stdout, await stderr);
    }

    internal delegate Task<CommandResult> CommandRunner(
        string fileName,
        string arguments,
        CancellationToken cancellationToken
    );

    internal readonly record struct CommandResult(int ExitCode, string StandardOutput, string StandardError);

    private readonly record struct MacListenerBinding(
        int ProcessId,
        int Port,
        ListenerBindScope BindScope,
        string ProcessName
    );
}

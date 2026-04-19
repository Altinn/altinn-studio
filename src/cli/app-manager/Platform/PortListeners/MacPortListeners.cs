using System.Globalization;
using System.Runtime.InteropServices;

namespace Altinn.Studio.AppManager.Platform.PortListeners;

internal sealed partial class MacPortListeners : IPortListenerSource
{
    private const int SignalZero = 0;
    private const int ErrorPermissionDenied = 1;
    private readonly Dictionary<MacListenerKey, PortListener> _knownListeners = [];

    public bool SupportsCurrentPlatform() => OperatingSystem.IsMacOS();

    public async Task<IReadOnlyList<PortListener>> Get(CancellationToken cancellationToken)
    {
        var currentListeners = await ReadListeningPorts(cancellationToken);
        if (currentListeners.Count == 0)
        {
            _knownListeners.Clear();
            return [];
        }

        var needsRefresh = false;
        var nextKnownListeners = new Dictionary<MacListenerKey, PortListener>(currentListeners.Count);
        foreach (var listenerKey in currentListeners)
        {
            if (!_knownListeners.TryGetValue(listenerKey, out var listener))
            {
                needsRefresh = true;
                continue;
            }

            if (!IsProcessAlive(listener.ProcessId))
            {
                needsRefresh = true;
                continue;
            }

            nextKnownListeners[listenerKey] = listener;
        }

        if (needsRefresh)
            await AddProcessMetadata(nextKnownListeners, currentListeners, cancellationToken);

        _knownListeners.Clear();
        foreach (var (listenerKey, listener) in nextKnownListeners)
            _knownListeners[listenerKey] = listener;

        return [.. nextKnownListeners.Values.Distinct()];
    }

    private async Task<HashSet<MacListenerKey>> ReadListeningPorts(CancellationToken cancellationToken)
    {
        var output = await RunCommand("netstat", "-na", cancellationToken);
        var listeners = new HashSet<MacListenerKey>();
        foreach (var line in output.Split(Environment.NewLine, StringSplitOptions.RemoveEmptyEntries))
        {
            if (!TryParseNetstatLine(line, out var listener))
                continue;

            listeners.Add(listener);
        }

        return listeners;
    }

    private async Task AddProcessMetadata(
        Dictionary<MacListenerKey, PortListener> knownListeners,
        HashSet<MacListenerKey> currentListeners,
        CancellationToken cancellationToken
    )
    {
        var output = await RunCommand("lsof", "-Fpcn -nP -iTCP -sTCP:LISTEN", cancellationToken);
        var commandLines = new Dictionary<int, string?>();
        var processName = string.Empty;
        var processId = 0;
        foreach (var line in output.Split(Environment.NewLine, StringSplitOptions.RemoveEmptyEntries))
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

                    if (!TryParseListener(value, out var listenerKey))
                        continue;

                    if (!currentListeners.Contains(listenerKey))
                        continue;

                    var commandLine = await ReadCommandLine(processId, commandLines, cancellationToken);
                    knownListeners[listenerKey] = new PortListener(
                        processId,
                        listenerKey.Port,
                        listenerKey.BindScope,
                        processName,
                        commandLine
                    );
                    break;
            }
        }
    }

    private static bool TryParseNetstatLine(string line, out MacListenerKey listener)
    {
        listener = default;
        if (string.IsNullOrWhiteSpace(line))
            return false;

        var fields = line.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        if (fields.Length < 4)
            return false;

        if (!fields[0].StartsWith("tcp", StringComparison.OrdinalIgnoreCase))
            return false;

        if (!fields[^1].Equals("LISTEN", StringComparison.Ordinal))
            return false;

        return TryParseListener(fields[^2].AsSpan(), out listener);
    }

    private static bool TryParseListener(ReadOnlySpan<char> addressField, out MacListenerKey listener)
    {
        listener = default;
        var separatorIndex = addressField.LastIndexOf('.');
        var colonIndex = addressField.LastIndexOf(':');
        if (colonIndex > separatorIndex)
            separatorIndex = colonIndex;

        if (separatorIndex < 0)
            return false;

        var hostField = addressField[..separatorIndex];
        var portField = addressField[(separatorIndex + 1)..];
        if (portField.Equals("*", StringComparison.Ordinal))
            return false;

        if (!int.TryParse(portField, CultureInfo.InvariantCulture, out var port))
            return false;

        listener = new MacListenerKey(port, ClassifyBindScope(hostField));
        return true;
    }

    private static ListenerBindScope ClassifyBindScope(ReadOnlySpan<char> hostField)
    {
        if (hostField.Equals("*", StringComparison.Ordinal))
            return ListenerBindScope.Any;

        if (
            hostField.Equals("127.0.0.1", StringComparison.Ordinal)
            || hostField.Equals("::1", StringComparison.Ordinal)
            || hostField.Equals("localhost", StringComparison.OrdinalIgnoreCase)
        )
            return ListenerBindScope.Loopback;

        return ListenerBindScope.Specific;
    }

    private static bool IsProcessAlive(int processId)
    {
        var result = Kill(processId, SignalZero);
        return result == 0 || Marshal.GetLastPInvokeError() == ErrorPermissionDenied;
    }

    private static async Task<string?> ReadCommandLine(
        int processId,
        Dictionary<int, string?> commandLines,
        CancellationToken cancellationToken
    )
    {
        if (commandLines.TryGetValue(processId, out var cached))
            return cached;

        string? commandLine = null;
        try
        {
            commandLine = (await RunCommand("ps", $"-p {processId} -o command=", cancellationToken)).Trim();
            if (commandLine.Length == 0)
                commandLine = null;
        }
        catch (InvalidOperationException)
        {
            commandLines[processId] = null;
            return null;
        }

        commandLines[processId] = commandLine;
        return commandLine;
    }

    private static async Task<string> RunCommand(string fileName, string arguments, CancellationToken cancellationToken)
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

        if (process.ExitCode != 0)
            throw new InvalidOperationException($"command '{fileName} {arguments}' failed: {await stderr}");

        return await stdout;
    }

    [LibraryImport("libc", SetLastError = true, EntryPoint = "kill")]
    private static partial int Kill(int processId, int signal);

    private readonly record struct MacListenerKey(int Port, ListenerBindScope BindScope);
}

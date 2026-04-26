using System.Buffers.Binary;
using System.Globalization;
using System.Net;
using System.Runtime.InteropServices;

namespace Altinn.Studio.AppManager.Platform.PortListeners;

internal sealed partial class LinuxPortListeners : IPortListenerSource
{
    private const string LinuxListenState = "0A";
    private readonly Dictionary<string, PortListener> _knownListeners = new(StringComparer.Ordinal);
    private readonly Dictionary<int, string> _processNames = [];

    public bool SupportsCurrentPlatform() => OperatingSystem.IsLinux();

    public async Task<IReadOnlyList<PortListener>> Get(CancellationToken cancellationToken)
    {
        var listenerPorts = await ReadListenerPorts(cancellationToken);
        if (listenerPorts.Count == 0)
        {
            _knownListeners.Clear();
            _processNames.Clear();
            return [];
        }

        var pendingInodes = new Dictionary<string, LinuxListenerBinding>(StringComparer.Ordinal);
        var listeners = new List<PortListener>(listenerPorts.Count);
        var nextKnownListeners = new Dictionary<string, PortListener>(listenerPorts.Count, StringComparer.Ordinal);
        foreach (var (inode, binding) in listenerPorts)
        {
            if (!_knownListeners.TryGetValue(inode, out var listener))
            {
                pendingInodes[inode] = binding;
                continue;
            }

            listeners.Add(listener);
            nextKnownListeners[inode] = listener;
        }

        if (pendingInodes.Count > 0)
            await AddProcessListeners(listeners, nextKnownListeners, pendingInodes, cancellationToken);

        _knownListeners.Clear();
        foreach (var (inode, listener) in nextKnownListeners)
            _knownListeners[inode] = listener;

        PruneProcessNames(nextKnownListeners.Values);

        return [.. listeners.Distinct()];
    }

    private void PruneProcessNames(IEnumerable<PortListener> listeners)
    {
        var activeProcessIds = listeners.Select(static listener => listener.ProcessId).ToHashSet();
        foreach (var processId in _processNames.Keys.ToArray())
            if (!activeProcessIds.Contains(processId))
                _processNames.Remove(processId);
    }

    private async Task AddProcessListeners(
        List<PortListener> listeners,
        Dictionary<string, PortListener> knownListeners,
        Dictionary<string, LinuxListenerBinding> pendingInodes,
        CancellationToken cancellationToken
    )
    {
        var effectiveUserId = GetEffectiveUserId();
        foreach (var procDir in Directory.EnumerateDirectories("/proc"))
        {
            cancellationToken.ThrowIfCancellationRequested();
            if (pendingInodes.Count == 0)
                return;

            var dirName = Path.GetFileName(procDir);
            if (!int.TryParse(dirName, CultureInfo.InvariantCulture, out var processId))
                continue;

            var processUserId = await ReadEffectiveUserId(procDir, cancellationToken);
            if (processUserId != effectiveUserId)
                continue;

            await AddProcessListeners(listeners, knownListeners, pendingInodes, procDir, processId, cancellationToken);
        }
    }

    private async Task AddProcessListeners(
        List<PortListener> listeners,
        Dictionary<string, PortListener> knownListeners,
        Dictionary<string, LinuxListenerBinding> pendingInodes,
        string procDir,
        int processId,
        CancellationToken cancellationToken
    )
    {
        var fdDir = Path.Join(procDir, "fd");
        if (!Directory.Exists(fdDir))
            return;

        var processName = await ReadProcessName(procDir, processId, cancellationToken);
        var commandLine = await ReadCommandLine(procDir, cancellationToken);

        foreach (var fdPath in EnumerateFdEntries(fdDir))
        {
            cancellationToken.ThrowIfCancellationRequested();
            if (pendingInodes.Count == 0)
                return;

            string? target;
            try
            {
                target = new FileInfo(fdPath).LinkTarget;
            }
            catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
            {
                continue;
            }

            if (target is null || !target.StartsWith("socket:[", StringComparison.Ordinal) || !target.EndsWith(']'))
                continue;

            var inode = target[8..^1];
            if (!pendingInodes.Remove(inode, out var binding))
                continue;

            var listener = new PortListener(processId, binding.Port, binding.BindScope, processName, commandLine);
            listeners.Add(listener);
            knownListeners[inode] = listener;
        }
    }

    private static async Task<uint?> ReadEffectiveUserId(string procDir, CancellationToken cancellationToken)
    {
        var statusPath = Path.Join(procDir, "status");
        if (!File.Exists(statusPath))
            return null;

        try
        {
            var lines = await File.ReadAllLinesAsync(statusPath, cancellationToken);
            foreach (var line in lines)
            {
                if (!TryParseEffectiveUserId(line, out var effectiveUserId))
                    continue;

                return effectiveUserId;
            }
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
        {
            return null;
        }

        return null;
    }

    private async Task<string?> ReadProcessName(string procDir, int processId, CancellationToken cancellationToken)
    {
        if (_processNames.TryGetValue(processId, out var processName))
            return processName;

        var commPath = Path.Join(procDir, "comm");
        if (!File.Exists(commPath))
            return null;

        try
        {
            processName = (await File.ReadAllTextAsync(commPath, cancellationToken)).Trim();
            if (processName.Length == 0)
                return null;

            _processNames[processId] = processName;
            return processName;
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
        {
            return null;
        }
    }

    private static async Task<string?> ReadCommandLine(string procDir, CancellationToken cancellationToken)
    {
        var cmdlinePath = Path.Join(procDir, "cmdline");
        if (!File.Exists(cmdlinePath))
            return null;

        try
        {
            var commandLine = (await File.ReadAllTextAsync(cmdlinePath, cancellationToken)).Replace('\0', ' ').Trim();
            return commandLine.Length == 0 ? null : commandLine;
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
        {
            return null;
        }
    }

    private static IEnumerable<string> EnumerateFdEntries(string fdDir)
    {
        try
        {
            return Directory.EnumerateFileSystemEntries(fdDir);
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
        {
            return [];
        }
    }

    private static async Task<Dictionary<string, LinuxListenerBinding>> ReadListenerPorts(
        CancellationToken cancellationToken
    )
    {
        var listeners = new Dictionary<string, LinuxListenerBinding>(StringComparer.Ordinal);
        await AddListenerPorts("/proc/net/tcp", isIpv6: false, listeners, cancellationToken);
        await AddListenerPorts("/proc/net/tcp6", isIpv6: true, listeners, cancellationToken);
        return listeners;
    }

    private static async Task AddListenerPorts(
        string path,
        bool isIpv6,
        Dictionary<string, LinuxListenerBinding> listeners,
        CancellationToken cancellationToken
    )
    {
        if (!File.Exists(path))
            return;

        var lines = await File.ReadAllLinesAsync(path, cancellationToken);
        foreach (var line in lines.Skip(1))
        {
            cancellationToken.ThrowIfCancellationRequested();

            if (!TryParseListenerLine(line, isIpv6, out var inode, out var binding))
                continue;

            listeners[inode] = binding;
        }
    }

    private static bool TryParseEffectiveUserId(string line, out uint effectiveUserId)
    {
        var span = line.AsSpan();
        effectiveUserId = 0;
        if (!span.StartsWith("Uid:", StringComparison.Ordinal))
            return false;

        span = span[4..];
        if (!TryReadNextField(ref span, out _))
            return false;

        if (!TryReadNextField(ref span, out var effectiveUserIdField))
            return false;

        return uint.TryParse(effectiveUserIdField, CultureInfo.InvariantCulture, out effectiveUserId);
    }

    private static bool TryParseListenerLine(
        string line,
        bool isIpv6,
        out string inode,
        out LinuxListenerBinding binding
    )
    {
        var span = line.AsSpan();
        inode = string.Empty;
        binding = default;

        if (
            !TryReadNextField(ref span, out _)
            || !TryReadNextField(ref span, out var localAddress)
            || !TryReadNextField(ref span, out _)
            || !TryReadNextField(ref span, out var state)
        )
            return false;

        if (!state.SequenceEqual(LinuxListenState))
            return false;

        for (var i = 0; i < 5; i++)
            if (!TryReadNextField(ref span, out _))
                return false;

        if (!TryReadNextField(ref span, out var inodeField))
            return false;

        var separator = localAddress.LastIndexOf(':');
        if (separator < 0)
            return false;

        if (
            !int.TryParse(
                localAddress[(separator + 1)..],
                NumberStyles.HexNumber,
                CultureInfo.InvariantCulture,
                out var port
            )
        )
            return false;

        if (!TryParseBindScope(localAddress[..separator], isIpv6, out var bindScope))
            return false;

        inode = inodeField.ToString();
        binding = new LinuxListenerBinding(port, bindScope);
        return true;
    }

    private static bool TryParseBindScope(ReadOnlySpan<char> addressField, bool isIpv6, out ListenerBindScope bindScope)
    {
        bindScope = default;
        if (isIpv6)
        {
            if (!TryParseIpv6Address(addressField, out var address))
                return false;

            bindScope = PortListener.FromAddress(0, 0, address).BindScope;
            return true;
        }

        if (!uint.TryParse(addressField, NumberStyles.HexNumber, CultureInfo.InvariantCulture, out var rawAddress))
            return false;

        Span<byte> addressBytes = stackalloc byte[sizeof(uint)];
        BinaryPrimitives.WriteUInt32LittleEndian(addressBytes, rawAddress);
        bindScope = PortListener.FromAddress(0, 0, new IPAddress(addressBytes)).BindScope;
        return true;
    }

    private static bool TryParseIpv6Address(ReadOnlySpan<char> addressField, out IPAddress address)
    {
        address = IPAddress.IPv6None;
        if (addressField.Length != 32)
            return false;

        Span<byte> bytes = stackalloc byte[16];
        for (var i = 0; i < bytes.Length; i++)
        {
            if (
                !byte.TryParse(
                    addressField[(i * 2)..((i * 2) + 2)],
                    NumberStyles.HexNumber,
                    CultureInfo.InvariantCulture,
                    out bytes[i]
                )
            )
                return false;
        }

        address = new IPAddress(bytes);
        return true;
    }

    private static bool TryReadNextField(ref ReadOnlySpan<char> span, out ReadOnlySpan<char> field)
    {
        while (!span.IsEmpty && char.IsWhiteSpace(span[0]))
            span = span[1..];

        if (span.IsEmpty)
        {
            field = default;
            return false;
        }

        var end = 0;
        while (end < span.Length && !char.IsWhiteSpace(span[end]))
            end++;

        if (end == span.Length)
        {
            field = span;
            span = [];
            return true;
        }

        field = span[..end];
        span = span[end..];
        return true;
    }

    [LibraryImport("libc", EntryPoint = "geteuid")]
    private static partial uint GetEffectiveUserId();

    private readonly record struct LinuxListenerBinding(int Port, ListenerBindScope BindScope);
}

using System.Buffers.Binary;
using System.Globalization;
using System.Net;
using System.Runtime.InteropServices;
using System.Text.Json;

namespace Altinn.Studio.AppManager.Platform.PortListeners;

internal sealed partial class WindowsPortListeners : IPortListenerSource
{
    private const uint AddressFamilyInet = 2;
    private const uint AddressFamilyInet6 = 23;
    private const uint ErrorInsufficientBuffer = 122;
    private const uint MaxTableSize = 10u << 20;
    private const uint TcpStateListen = 2;
    private readonly Dictionary<int, string> _processNames = [];
    private readonly Dictionary<int, string?> _commandLines = [];

    public bool SupportsCurrentPlatform() => OperatingSystem.IsWindows();

    public async Task<IReadOnlyList<PortListener>> Get(CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        var listeners = await Task.Run(
            () =>
            {
                var snapshot = new List<PortListener>();
                snapshot.AddRange(ReadTcp4Listeners());
                snapshot.AddRange(ReadTcp6Listeners());
                return (IReadOnlyList<PortListener>)[.. snapshot.Distinct()];
            },
            cancellationToken
        );

        await ResolveMissingCommandLines(listeners, cancellationToken);

        var resolvedListeners = new List<PortListener>(listeners.Count);
        foreach (var listener in listeners)
            resolvedListeners.Add(ResolveProcessMetadata(listener));

        PruneProcessCaches(resolvedListeners);
        return resolvedListeners;
    }

    private void PruneProcessCaches(IEnumerable<PortListener> listeners)
    {
        var activeProcessIds = listeners.Select(static listener => listener.ProcessId).ToHashSet();
        foreach (var processId in _processNames.Keys.ToArray())
            if (!activeProcessIds.Contains(processId))
                _processNames.Remove(processId);
        foreach (var processId in _commandLines.Keys.ToArray())
            if (!activeProcessIds.Contains(processId))
                _commandLines.Remove(processId);
    }

    private static IReadOnlyList<PortListener> ReadTcp4Listeners() =>
        ReadTcpListeners(
            AddressFamilyInet,
            static rowPtr => Marshal.PtrToStructure<MibTcpRowOwnerPid>(rowPtr),
            TryCreateListener
        );

    private static IReadOnlyList<PortListener> ReadTcp6Listeners() =>
        ReadTcpListeners(
            AddressFamilyInet6,
            static rowPtr => Marshal.PtrToStructure<MibTcp6RowOwnerPid>(rowPtr),
            TryCreateListener
        );

    private static unsafe IReadOnlyList<PortListener> ReadTcpListeners<TRow>(
        uint addressFamily,
        Func<IntPtr, TRow> readRow,
        Func<TRow, PortListener?> createListener
    )
        where TRow : struct
    {
        var bufferSize = 0u;
        var result = GetExtendedTcpTable(
            IntPtr.Zero,
            ref bufferSize,
            sort: true,
            addressFamily,
            TcpTableClass.OwnerPidAll,
            0
        );
        if (result != ErrorInsufficientBuffer || bufferSize == 0)
            throw new InvalidOperationException($"GetExtendedTcpTable failed: {result}");
        if (bufferSize > MaxTableSize || bufferSize < sizeof(uint))
            throw new InvalidOperationException($"GetExtendedTcpTable returned unreasonable size: {bufferSize}");

        var buffer = (IntPtr)NativeMemory.Alloc(bufferSize);
        try
        {
            result = GetExtendedTcpTable(
                buffer,
                ref bufferSize,
                sort: true,
                addressFamily,
                TcpTableClass.OwnerPidAll,
                0
            );
            if (result != 0)
                throw new InvalidOperationException($"GetExtendedTcpTable failed: {result}");

            var listeners = new List<PortListener>();
            var rowCount = Marshal.ReadInt32(buffer);
            var rowSize = Marshal.SizeOf<TRow>();
            var rowPtr = IntPtr.Add(buffer, sizeof(uint));

            for (var i = 0; i < rowCount; i++)
            {
                var row = readRow(rowPtr);
                rowPtr = IntPtr.Add(rowPtr, rowSize);

                var listener = createListener(row);
                if (listener is null)
                    continue;

                listeners.Add(listener);
            }

            return listeners;
        }
        finally
        {
            NativeMemory.Free((void*)buffer);
        }
    }

    private static PortListener? TryCreateListener(MibTcpRowOwnerPid row)
    {
        if (row.State != TcpStateListen)
            return null;

        return PortListener.FromAddress((int)row.OwningPid, ReadPort(row.LocalPort), ReadIpv4Address(row.LocalAddress));
    }

    private static PortListener? TryCreateListener(MibTcp6RowOwnerPid row)
    {
        if (row.State != TcpStateListen)
            return null;

        return PortListener.FromAddress((int)row.OwningPid, ReadPort(row.LocalPort), ReadIpv6Address(row));
    }

    private static int ReadPort(uint localPort)
    {
        var port = (ushort)localPort;
        return BinaryPrimitives.ReverseEndianness(port);
    }

    private static IPAddress ReadIpv4Address(uint localAddress)
    {
        var networkOrderAddress = BinaryPrimitives.ReverseEndianness(localAddress);
        Span<byte> addressBytes = stackalloc byte[sizeof(uint)];
        BinaryPrimitives.WriteUInt32BigEndian(addressBytes, networkOrderAddress);
        return new IPAddress(addressBytes);
    }

    private static unsafe IPAddress ReadIpv6Address(MibTcp6RowOwnerPid row)
    {
        var addressBytes = new byte[16];
        for (var i = 0; i < addressBytes.Length; i++)
            addressBytes[i] = row.LocalAddress[i];
        return new IPAddress(addressBytes);
    }

    private PortListener ResolveProcessMetadata(PortListener listener)
    {
        var processName = ResolveProcessName(listener.ProcessId);
        _commandLines.TryGetValue(listener.ProcessId, out var commandLine);
        return listener with { ProcessName = processName, CommandLine = commandLine };
    }

    private string? ResolveProcessName(int processId)
    {
        if (_processNames.TryGetValue(processId, out var processName))
            return processName;

        try
        {
            using var process = System.Diagnostics.Process.GetProcessById(processId);
            processName = process.ProcessName;
            _processNames[processId] = processName;
            return processName;
        }
        catch (Exception ex) when (ex is ArgumentException or InvalidOperationException)
        {
            return null;
        }
    }

    private async Task ResolveMissingCommandLines(
        IReadOnlyList<PortListener> listeners,
        CancellationToken cancellationToken
    )
    {
        var processIds = listeners
            .Select(static listener => listener.ProcessId)
            .Distinct()
            .Where(processId => !_commandLines.ContainsKey(processId))
            .ToArray();
        if (processIds.Length == 0)
            return;

        foreach (var processId in processIds)
            _commandLines[processId] = null;

        try
        {
            var command = CimCommandLineQuery(processIds);
            var output = await RunPowerShell(command, cancellationToken);
            if (string.IsNullOrWhiteSpace(output))
                return;

            using var document = JsonDocument.Parse(output);
            if (document.RootElement.ValueKind == JsonValueKind.Array)
            {
                foreach (var element in document.RootElement.EnumerateArray())
                    AddCommandLine(element);
            }
            else
            {
                AddCommandLine(document.RootElement);
            }
        }
        catch (Exception ex) when (CommandLineLookupFailed(ex, cancellationToken))
        {
            MarkCommandLinesUnavailable(processIds);
        }
    }

    private void MarkCommandLinesUnavailable(IEnumerable<int> processIds)
    {
        foreach (var processId in processIds)
            _commandLines[processId] = null;
    }

    private void AddCommandLine(JsonElement element)
    {
        if (
            element.ValueKind != JsonValueKind.Object
            || !element.TryGetProperty("ProcessId", out var processIdProperty)
            || !processIdProperty.TryGetInt32(out var processId)
            || !element.TryGetProperty("CommandLine", out var commandLineProperty)
        )
            return;

        var commandLine =
            commandLineProperty.ValueKind == JsonValueKind.String ? commandLineProperty.GetString() : null;
        _commandLines[processId] = string.IsNullOrWhiteSpace(commandLine) ? null : commandLine;
    }

    private static string CimCommandLineQuery(int[] processIds)
    {
        var filter = string.Join(
            " OR ",
            processIds.Select(static processId => $"ProcessId = {processId.ToString(CultureInfo.InvariantCulture)}")
        );
        return $"Get-CimInstance Win32_Process -Filter \"{filter}\" | Select-Object ProcessId,CommandLine | ConvertTo-Json -Compress";
    }

    private static bool CommandLineLookupFailed(Exception exception, CancellationToken cancellationToken) =>
        exception is InvalidOperationException or JsonException or System.ComponentModel.Win32Exception
        || (exception is OperationCanceledException && !cancellationToken.IsCancellationRequested);

    private static async Task<string> RunPowerShell(string command, CancellationToken cancellationToken)
    {
        using var process = new System.Diagnostics.Process
        {
            StartInfo = ProcessUtil.CreateStartInfo("powershell.exe"),
        };
        process.StartInfo.RedirectStandardOutput = true;
        process.StartInfo.RedirectStandardError = true;
        process.StartInfo.ArgumentList.Add("-NoProfile");
        process.StartInfo.ArgumentList.Add("-NonInteractive");
        process.StartInfo.ArgumentList.Add("-Command");
        process.StartInfo.ArgumentList.Add(command);

        process.Start();
        var stdout = process.StandardOutput.ReadToEndAsync(cancellationToken);
        var stderr = process.StandardError.ReadToEndAsync(cancellationToken);
        await process.WaitForExitAsync(cancellationToken);

        if (process.ExitCode != 0)
            throw new InvalidOperationException($"command 'powershell.exe' failed: {await stderr}");

        return await stdout;
    }

    [LibraryImport("iphlpapi.dll", SetLastError = true)]
    private static partial uint GetExtendedTcpTable(
        IntPtr tcpTable,
        ref uint outBufferLength,
        [MarshalAs(UnmanagedType.Bool)] bool sort,
        uint ipVersion,
        TcpTableClass tableClass,
        uint reserved
    );

    private enum TcpTableClass
    {
        OwnerPidAll = 5,
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct MibTcpRowOwnerPid
    {
        public uint State;
        public uint LocalAddress;
        public uint LocalPort;
        public uint RemoteAddress;
        public uint RemotePort;
        public uint OwningPid;
    }

    [StructLayout(LayoutKind.Sequential)]
    private unsafe struct MibTcp6RowOwnerPid
    {
        public fixed byte LocalAddress[16];
        public uint LocalScopeId;
        public uint LocalPort;
        public fixed byte RemoteAddress[16];
        public uint RemoteScopeId;
        public uint RemotePort;
        public uint State;
        public uint OwningPid;
    }
}

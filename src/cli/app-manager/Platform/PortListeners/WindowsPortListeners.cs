using System.Buffers.Binary;
using System.Net;
using System.Runtime.InteropServices;

namespace Altinn.Studio.AppManager.Platform.PortListeners;

internal sealed partial class WindowsPortListeners : IPortListenerSource
{
    private const uint AddressFamilyInet = 2;
    private const uint AddressFamilyInet6 = 23;
    private const uint ErrorInsufficientBuffer = 122;
    private const uint MaxTableSize = 10u << 20;
    private const uint TcpStateListen = 2;
    private readonly Dictionary<int, string> _processNames = [];

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

        var resolvedListeners = new List<PortListener>(listeners.Count);
        foreach (var listener in listeners)
            resolvedListeners.Add(ResolveProcessName(listener));
        return resolvedListeners;
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

    private PortListener ResolveProcessName(PortListener listener)
    {
        if (_processNames.TryGetValue(listener.ProcessId, out var processName))
            return listener with { ProcessName = processName };

        try
        {
            using var process = System.Diagnostics.Process.GetProcessById(listener.ProcessId);
            processName = process.ProcessName;
            _processNames[listener.ProcessId] = processName;
            return listener with { ProcessName = processName };
        }
        catch (Exception ex) when (ex is ArgumentException or InvalidOperationException)
        {
            return listener;
        }
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

package osutil

import (
	"net"
	"net/netip"
)

// IPv6Enabled reports whether IPv6 loopback is configured on the machine.
func IPv6Enabled() bool {
	interfaces, err := net.Interfaces()
	if err != nil {
		return false
	}

	for _, iface := range interfaces {
		if iface.Flags&net.FlagUp == 0 || iface.Flags&net.FlagLoopback == 0 {
			continue
		}

		addrs, err := iface.Addrs()
		if err != nil {
			continue
		}

		if hasLoopbackIPv6(addrs) {
			return true
		}
	}

	return false
}

func hasLoopbackIPv6(addrs []net.Addr) bool {
	for _, addr := range addrs {
		ip, ok := ipFromAddr(addr)
		if !ok {
			continue
		}
		ip = ip.Unmap()
		if ip.Is6() && ip.IsLoopback() {
			return true
		}
	}
	return false
}

func ipFromAddr(addr net.Addr) (netip.Addr, bool) {
	switch value := addr.(type) {
	case *net.IPAddr:
		return netip.AddrFromSlice(value.IP)
	case *net.IPNet:
		return netip.AddrFromSlice(value.IP)
	default:
		return netip.Addr{}, false
	}
}

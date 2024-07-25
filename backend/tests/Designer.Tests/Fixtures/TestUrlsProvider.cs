using System;
using System.Net;
using System.Net.Sockets;

namespace Designer.Tests.Fixtures
{
    public sealed class TestUrlsProvider
    {
        private static readonly Lazy<TestUrlsProvider> _instance = new(() => new TestUrlsProvider());

        public static TestUrlsProvider Instance => _instance.Value;

        public int DesignerPort { get; }
        public int LoadBalancerPort { get; } = 80;
        public int GiteaPort { get; }

        public string TestDomain { get; }
        public string TestDomainUrl { get; }

        private TestUrlsProvider()
        {
            DesignerPort = GetRandomAvailablePort();
            // LoadBalancerPort = GetRandomAvailablePort();
            GiteaPort = GetRandomAvailablePort();
            TestDomain = "localhost";
            TestDomainUrl = $"http://{TestDomain}";
        }

        private static int GetRandomAvailablePort()
        {
            using var listener = new TcpListener(IPAddress.Loopback, 0);
            listener.Start();
            return ((IPEndPoint)listener.LocalEndpoint).Port;
        }
    }
}

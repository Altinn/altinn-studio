using System;
using System.Net;
using System.Net.Sockets;

namespace Designer.Tests.Fixtures
{
    public sealed class TestUrlsProvider
    {
        private static readonly Lazy<TestUrlsProvider> s_instance = new(() => new TestUrlsProvider());

        public static TestUrlsProvider Instance => s_instance.Value;

        public int DesignerPort { get; }
        public int GiteaPort { get; }

        public string DesignerUrl { get; }
        public string GiteaUrl { get; }

        private TestUrlsProvider()
        {
            DesignerPort = GetRandomAvailablePort();
            GiteaPort = GetRandomAvailablePort();
            DesignerUrl = $"http://localhost:{DesignerPort}";
            GiteaUrl = $"http://localhost:{GiteaPort}";

        }

        public static int GetRandomAvailablePort()
        {
            using var listener = new TcpListener(IPAddress.Loopback, 0);
            listener.Start();
            return ((IPEndPoint)listener.LocalEndpoint).Port;
        }
    }
}

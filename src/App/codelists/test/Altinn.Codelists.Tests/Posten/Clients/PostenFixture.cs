using System.Runtime.CompilerServices;
using Altinn.Codelists.Posten;
using WireMock.Server;
using WireMock.Settings;

namespace Altinn.Codelists.Tests.Posten.Clients;

internal sealed class PostenFixture : IAsyncDisposable
{
    public WireMockServer Server { get; }

    private PostenFixture(WireMockServer server) => Server = server;

    public ValueTask DisposeAsync()
    {
        Server.Dispose();
        return default;
    }

    /// <summary>
    /// Starts a mock server for bring API
    /// - Proxy == true: it will just proxy the request through to the actual bring API, and save the request and response as a mapping
    /// - Proxy == false: serve the static mapping in the mappings folder
    ///
    /// To update the test data/mapping, just pass proxy == true
    /// In addition we can trim down the result set:
    /// 1. `wget https://www.bring.no/postnummerregister-ansi.txt`
    /// 2. `sed -i '10,5060 d' postnummerregister-ansi.txt`
    /// 3. `cat postnummerregister-ansi.txt | base64 -w 0`
    /// 4. Update the `Response.BodyAsBytes` property of the mapping JSON file
    /// 5. Update content length response header based on `stat postnummerregister-ansi.txt`
    /// 6. Remove header matching for hostname and such in the mapping JSON file
    /// Next time the test is ran with proxy == false, it will use the updated mapping
    /// </summary>
    public static Task<PostenFixture> Create(bool proxy)
    {
        var server = StartServer(proxy);
        return Task.FromResult(new PostenFixture(server));
    }

    private static WireMockServer StartServer(bool proxy, [CallerFilePath] string filePath = "")
    {
        WireMockServerSettings settings;
        if (proxy)
        {
            settings = new WireMockServerSettings
            {
                StartAdminInterface = true,
                ProxyAndRecordSettings = new ProxyAndRecordSettings
                {
                    Url = PostenSettings.DefaultBaseUrl,
                    SaveMapping = true,
                    SaveMappingToFile = true,
                    SaveMappingForStatusCodePattern = "2xx",
                    PrefixForSavedMappingFile = "wiremock",
                },
            };
        }
        else
        {
            settings = new WireMockServerSettings { };
        }
        var server = WireMockServer.Start(settings);
        var dir = new FileInfo(filePath).Directory?.FullName;
        Assert.NotNull(dir);
        dir = Path.Join(dir, "mappings");
        if (proxy)
        {
            server.SaveStaticMappings(dir);
        }
        else
        {
            server.ReadStaticMappings(dir);
        }

        return server;
    }
}

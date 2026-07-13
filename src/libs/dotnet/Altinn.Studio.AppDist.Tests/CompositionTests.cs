using System.Text;
using Xunit;

namespace Altinn.Studio.AppDist.Tests;

public sealed class CompositionTests : IDisposable
{
    private readonly string _root = Directory.CreateTempSubdirectory("appdist-composition-tests-").FullName;

    public void Dispose() => Directory.Delete(_root, recursive: true);

    [Fact]
    public async Task PullThroughHttpIntoFileSystemStoreAndReadBack()
    {
        var handler = new FakeRegistry();
        var blob = FakeRegistry.TarGz(
            ("schemas/json/layout/layout.schema.v1.json", """{"type":"object"}"""),
            ("schemas/json/layout/expression.schema.v1.json", "{}")
        );
        var digest = handler.AddBlob(blob);
        handler.SetManifest("4", ("application/vnd.altinn.app.schemas.tar+gzip", digest, blob.Length));

        IAppDistProvider provider = new AppDist(
            new OciRegistrySource(new HttpClient(handler), $"{FakeRegistry.Host}/{FakeRegistry.Repository}"),
            new FileSystemAppDistStore(_root)
        );

        await using var stream = await provider.GetFileAsync("4", AppDist.JsonSchemas.Layout);
        Assert.NotNull(stream);
        using var reader = new StreamReader(stream, Encoding.UTF8);
        Assert.Equal("""{"type":"object"}""", await reader.ReadToEndAsync());

        var files = await provider.ListFilesAsync("4");
        string[] expected =
        [
            "schemas/json/layout/expression.schema.v1.json",
            "schemas/json/layout/layout.schema.v1.json",
        ];
        Assert.Equal(expected, files);
    }
}

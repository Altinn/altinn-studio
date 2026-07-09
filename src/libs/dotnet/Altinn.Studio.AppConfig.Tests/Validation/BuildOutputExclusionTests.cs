using Altinn.Studio.AppConfig;
using Altinn.Studio.AppConfig.Documents;
using Xunit;

namespace Altinn.Studio.AppConfig.Tests.Validation;

public sealed class BuildOutputExclusionTests
{
    [Fact]
    public void RoslynIntrospection_IgnoresGeneratedSources_UnderObj()
    {
        var dir = new InMemoryAppDirectory(
            new()
            {
                ["App/config/applicationmetadata.json"] = TestMeta.Json(),
                ["App/models/Soknad.cs"] = "namespace App.Models; public class Soknad { }",
                ["App/obj/Debug/net10.0/App.AssemblyInfo.cs"] =
                    "namespace App.Generated; public class GeneratedNoise { }",
                ["App/bin/Debug/net10.0/Copied.cs"] = "namespace App.Generated; public class CopiedNoise { }",
            }
        );

        var model = AppConfigEngine.Open(dir).Current;

        Assert.True(model.CSharpClasses.ContainsKey("App.Models.Soknad"));
        Assert.False(model.CSharpClasses.ContainsKey("App.Generated.GeneratedNoise"));
        Assert.False(model.CSharpClasses.ContainsKey("App.Generated.CopiedNoise"));
    }

    private static readonly string[] expected = new[] { "App/models/a.cs" };

    [Fact]
    public void InMemoryEnumeration_SkipsBinAndObj()
    {
        var dir = new InMemoryAppDirectory(
            new()
            {
                ["App/models/a.cs"] = "x",
                ["App/obj/g.cs"] = "x",
                ["App/bin/b.cs"] = "x",
            }
        );

        Assert.Equal(expected, dir.EnumerateFiles("App", "*.cs", recursive: true));
        Assert.NotNull(dir.ReadAllBytes("App/obj/g.cs"));
    }

    [Fact]
    public void FileSystemEnumeration_SkipsBinAndObj()
    {
        var root = Path.Combine(Path.GetTempPath(), "appconfig-binobj-" + Guid.NewGuid().ToString("N"));
        try
        {
            var dir = new FileSystemAppDirectory(root);
            dir.WriteAllBytes("App/models/a.cs", new byte[] { 1 });
            dir.WriteAllBytes("App/obj/Debug/g.cs", new byte[] { 1 });
            dir.WriteAllBytes("App/bin/Debug/b.cs", new byte[] { 1 });

            Assert.Equal(expected, dir.EnumerateFiles("App", "*.cs", recursive: true));
        }
        finally
        {
            if (Directory.Exists(root))
                Directory.Delete(root, recursive: true);
        }
    }
}

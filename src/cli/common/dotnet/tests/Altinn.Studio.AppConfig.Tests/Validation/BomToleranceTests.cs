using System.Text;
using Altinn.Studio.AppConfig;
using Altinn.Studio.AppConfig.Documents;
using Xunit;

namespace Altinn.Studio.AppConfig.Tests.Validation;

public sealed class BomToleranceTests
{
    private const string Bom = "﻿";

    [Fact]
    public void Utf8BomPrefixedJson_ParsesAndValidates()
    {
        var dir = new InMemoryAppDirectory(
            new() { ["App/config/applicationmetadata.json"] = Bom + TestMeta.Json("ttd/bom", "model") }
        );

        var config = AppConfigEngine.Open(dir);

        Assert.Contains("model", config.Current.DataTypes.Select(d => d.Id));
        Assert.Equal("ttd/bom", config.Current.ApplicationId);
        Assert.DoesNotContain(config.Validate().Findings, f => f.RuleId == "SYNTAX-VALID");
    }

    [Fact]
    public void WriteAllBytes_OntoBomPrefixedFile_KeepsTheBom()
    {
        var dir = new InMemoryAppDirectory();
        dir.Set("a.json", Bom + "{\"x\":1}");

        Assert.Equal(Encoding.UTF8.GetBytes("{\"x\":1}"), dir.ReadAllBytes("a.json"));
        Assert.Equal(Encoding.UTF8.GetBytes(Bom + "{\"x\":1}"), dir.ReadRawBytes("a.json"));

        dir.WriteAllBytes("a.json", Encoding.UTF8.GetBytes("{\"x\":2}"));
        Assert.Equal(Encoding.UTF8.GetBytes(Bom + "{\"x\":2}"), dir.ReadRawBytes("a.json"));

        // A BOM-less file stays BOM-less, and a fresh file is written verbatim.
        dir.Set("b.json", "{}");
        dir.WriteAllBytes("b.json", Encoding.UTF8.GetBytes("{\"y\":1}"));
        Assert.Equal(Encoding.UTF8.GetBytes("{\"y\":1}"), dir.ReadRawBytes("b.json"));
        dir.WriteAllBytes("c.json", Encoding.UTF8.GetBytes("{}"));
        Assert.Equal(Encoding.UTF8.GetBytes("{}"), dir.ReadRawBytes("c.json"));
    }
}

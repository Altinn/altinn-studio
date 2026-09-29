using System.Text;
using Altinn.Studio.AppConfig.Documents;

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
    public void ReadAllBytes_StripsTheBom()
    {
        var dir = new InMemoryAppDirectory();
        dir.Set("a.json", Bom + "{\"x\":1}");

        Assert.Equal(Encoding.UTF8.GetBytes("{\"x\":1}"), dir.ReadAllBytes("a.json"));
    }
}

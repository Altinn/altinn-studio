using System.Text;
using Altinn.Studio.AppConfig;
using Altinn.Studio.AppConfig.Documents;
using Altinn.Studio.AppConfig.Validation;
using Xunit;

namespace Altinn.Studio.AppConfig.Tests.Validation;

public sealed class AppConfigTests
{
    private static readonly string[] _firstBuildUnits =
    {
        "metadata",
        "datamodel",
        "layoutsets",
        "layout::App/ui/Task_1/layouts/P1.json",
    };
    private static readonly string[] _reparsedLayoutOnly = ["layout::App/ui/Task_1/layouts/P1.json"];
    private static readonly string[] _reparsedMetadataAndModel = ["metadata", "datamodel"];

    private static Dictionary<string, string> SampleApp() =>
        new()
        {
            ["App/config/applicationmetadata.json"] = TestMeta.Json("ttd/inc", "model"),
            ["App/ui/Task_1/Settings.json"] = """{"pages":{"order":["P1","P2","Missing"]}}""",
            ["App/ui/Task_1/layouts/P1.json"] =
                """{"data":{"layout":[{"id":"a","type":"Input","dataModelBindings":{"simpleBinding":"project.bad"}}]}}""",
            ["App/ui/Task_1/layouts/P2.json"] =
                """{"data":{"layout":[{"id":"b","type":"Input","dataModelBindings":{"simpleBinding":"project.good"}}]}}""",
            ["App/models/model.schema.json"] =
                """{"properties":{"project":{"type":"object","properties":{"good":{"type":"string"}}}}}""",
        };

    [Fact]
    public void Build_UnchangedWorkspace_ReturnsTheSameModelInstance()
    {
        var dir = new MutableAppDirectory(SampleApp());
        var engine = AppConfigEngine.Open(dir);

        var first = engine.Build();
        var second = engine.Build();
        Assert.Same(first, second);

        dir.Set("App/ui/Task_1/Settings.json", """{"pages":{"order":["P1","P2"]}}""");
        var third = engine.Build();
        Assert.NotSame(second, third);
        Assert.Same(third, engine.Build());
    }

    [Fact]
    public void Assembled_Validates_IdenticallyToFullLoad()
    {
        var dir = new MutableAppDirectory(SampleApp());

        var incremental = AppConfigEngine.Open(dir).Build();
        var full = AppConfigEngine.Open(dir).Build();

        var incFindings = ValidationEngine.Run(incremental).Findings;
        var fullFindings = ValidationEngine.Run(full).Findings;

        Assert.NotEmpty(incFindings);
        Assert.Equal(
            fullFindings.OrderBy(f => f.RuleId).ThenBy(f => f.Message),
            incFindings.OrderBy(f => f.RuleId).ThenBy(f => f.Message)
        );
    }

    [Fact]
    public void Build_ReparsesOnlyChangedAspect()
    {
        var dir = new MutableAppDirectory(SampleApp());
        var engine = AppConfigEngine.Open(dir);

        engine.Build();
        Assert.All(_firstBuildUnits, u => Assert.Contains(u, engine.LastReparsed));

        dir.Set(
            "App/ui/Task_1/layouts/P1.json",
            """{"data":{"layout":[{"id":"a","type":"Input","dataModelBindings":{"simpleBinding":"project.good"}}]}}"""
        );
        engine.Build();
        Assert.Equal(_reparsedLayoutOnly.OrderBy(s => s), engine.LastReparsed.OrderBy(s => s));

        dir.Set("App/config/applicationmetadata.json", TestMeta.Json("ttd/inc2", "model"));
        engine.Build();
        Assert.Equal(_reparsedMetadataAndModel.OrderBy(s => s), engine.LastReparsed.OrderBy(s => s));

        engine.Build();
        Assert.Empty(engine.LastReparsed);
    }

    [Fact]
    public void Build_IsIdempotent_DoesNotAccumulateComponents()
    {
        var engine = AppConfigEngine.Open(new MutableAppDirectory(SampleApp()));
        engine.Build();
        engine.Build();
        var model = engine.Build();

        var set = model.LayoutSets.Single();
        var componentIds = set.AllComponents.Select(c => c.Id);
        Assert.Equal(componentIds.Count(), componentIds.Distinct().Count());
        Assert.DoesNotContain(ValidationEngine.Run(model).Findings, f => f.RuleId == "UNIQUE-COMPONENT-ID");
    }

    [Fact]
    public void ResolveNodeAt_FindsPointerUnderCursor()
    {
        const string layout =
            "{\n  \"data\": {\n    \"layout\": [\n      { \"id\": \"a\", \"type\": \"Input\" }\n    ]\n  }\n}";
        var dir = new MutableAppDirectory(
            new()
            {
                ["App/config/applicationmetadata.json"] = TestMeta.Json(),
                ["App/ui/Task_1/layouts/P1.json"] = layout,
            }
        );
        var engine = AppConfigEngine.Open(dir);
        const string file = "App/ui/Task_1/layouts/P1.json";

        var onValue = engine.ResolveNodeAt(file, 4, 16);
        Assert.NotNull(onValue);
        Assert.Equal("/data/layout/0/id", onValue.GetValueOrDefault().Pointer);
        Assert.False(onValue.GetValueOrDefault().Key);

        var onKey = engine.ResolveNodeAt(file, 4, 10);
        Assert.NotNull(onKey);
        Assert.Equal("/data/layout/0/id", onKey.GetValueOrDefault().Pointer);
        Assert.True(onKey.GetValueOrDefault().Key);
    }

    [Fact]
    public void SchemaParser_ResolvesRefsDefsAndArrays()
    {
        const string model = """
            {
              "type": "object",
              "properties": {
                "reportedData": { "$ref": "#/$defs/ReportedData" },
                "attachments": { "type": "array", "items": { "$ref": "#/$defs/Attachment" } }
              },
              "$defs": {
                "ReportedData": {
                  "type": "object",
                  "properties": { "request": { "$ref": "#/$defs/Request" } }
                },
                "Request": { "type": "object", "properties": { "trademarkType": { "type": "string" } } },
                "Attachment": { "type": "object", "properties": { "attachmentId": { "type": "string" } } }
              }
            }
            """;
        const string layout = """
            {"data":{"layout":[
              {"id":"a","type":"Input","dataModelBindings":{"simpleBinding":"reportedData.request.trademarkType"}},
              {"id":"b","type":"Input","dataModelBindings":{"simpleBinding":"attachments.attachmentId"}}
            ]}}
            """;
        var dir = new MutableAppDirectory(
            new()
            {
                ["App/config/applicationmetadata.json"] = TestMeta.Json("ttd/r", "model"),
                ["App/ui/Task_1/Settings.json"] = """{"pages":{"order":["P1"]}}""",
                ["App/ui/Task_1/layouts/P1.json"] = layout,
                ["App/models/model.schema.json"] = model,
            }
        );
        var engine = AppConfigEngine.Open(dir);

        var report = ValidationEngine.Run(engine.Build());
        Assert.DoesNotContain(report.Findings, f => f.RuleId == "REF-DATAMODEL-PATH");
    }
}

internal sealed class MutableAppDirectory : IAppDirectory
{
    private readonly Dictionary<string, byte[]> _files;

    public MutableAppDirectory(Dictionary<string, string> files) =>
        _files = files.ToDictionary(kv => kv.Key, kv => Encoding.UTF8.GetBytes(kv.Value), StringComparer.Ordinal);

    public void Set(string relativePath, string content) => _files[relativePath] = Encoding.UTF8.GetBytes(content);

    public string Root => "/mut";

    public bool Exists(string relativePath) => _files.ContainsKey(relativePath);

    public bool DirectoryExists(string relativeDir) =>
        _files.Keys.Any(k => k.StartsWith(relativeDir + "/", StringComparison.Ordinal));

    public byte[]? ReadAllBytes(string relativePath) => _files.TryGetValue(relativePath, out var b) ? b : null;

    public byte[]? ReadExternalBytes(string relativePath) => null;

    public IEnumerable<string> EnumerateFiles(string relativeDir, string searchPattern, bool recursive)
    {
        foreach (var key in _files.Keys)
        {
            if (recursive)
            {
                if (!key.StartsWith(relativeDir + "/", StringComparison.Ordinal))
                    continue;
            }
            else
            {
                var slash = key.LastIndexOf('/');
                var parent = slash >= 0 ? key[..slash] : "";
                if (!string.Equals(parent, relativeDir, StringComparison.Ordinal))
                    continue;
            }
            var name = key[(key.LastIndexOf('/') + 1)..];
            if (Matches(name, searchPattern))
                yield return key;
        }
    }

    private static bool Matches(string name, string pattern)
    {
        var star = pattern.IndexOf('*');
        if (star < 0)
            return string.Equals(name, pattern, StringComparison.Ordinal);
        var prefix = pattern[..star];
        var suffix = pattern[(star + 1)..];
        return name.Length >= prefix.Length + suffix.Length
            && name.StartsWith(prefix, StringComparison.Ordinal)
            && name.EndsWith(suffix, StringComparison.Ordinal);
    }
}

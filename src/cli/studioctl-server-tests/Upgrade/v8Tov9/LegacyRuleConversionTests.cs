using System.Reflection;
using System.Text.Json;
using Altinn.Studio.Cli.Upgrade.v8Tov9.RuleConfiguration;
using Altinn.Studio.Cli.Upgrade.v8Tov9.RuleConfiguration.DataProcessingRules;
using Altinn.Studio.Cli.Upgrade.v8Tov9.RuleConfiguration.Models;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;

namespace Studioctl.Tests.Upgrade.v8Tov9;

// The generated C# is a best-effort translation over the typed model. These cases are the rule
// shapes legacy apps use, with plausible form input.
public sealed class LegacyRuleConversionTests
{
    private const string Defaults = "obj.a = obj.a ? +obj.a : 0; obj.b = obj.b ? +obj.b : 0; ";

    [Theory]
    [InlineData(Defaults + "return (obj.a + obj.b).toString();", "{\"a\":1.5,\"b\":2}", "string?", "\"3.5\"")]
    [InlineData(
        "tall1 = obj.a ? +obj.a : 0; tall2 = obj.b ? +obj.b : 0; return 100 - (tall1 + tall2);",
        "{\"a\":30}",
        "decimal?",
        "70"
    )]
    [InlineData(
        Defaults + "if (obj.a > 0 && obj.b > 0) { return Math.round(obj.a / obj.b * 100) / 100; } else { return 0; }",
        "{\"a\":10,\"b\":3}",
        "decimal?",
        "3.33"
    )]
    [InlineData(
        Defaults + "if (obj.b == 0) return 0; return Number((obj.a / obj.b).toFixed(1));",
        "{\"a\":10,\"b\":4}",
        "decimal?",
        "2.5"
    )]
    [InlineData(
        "var flag = 0; if ((obj.a > obj.b * 1.4) && obj.b > 5000) { flag = 1; } return flag;",
        "{\"a\":8000,\"b\":5002}",
        "decimal?",
        "1"
    )]
    [InlineData("if (obj.a == null || obj.b == null) { return 0; } return obj.a - obj.b;", "{\"a\":5}", "long?", "0")]
    [InlineData(
        "let sum = 0; if (obj.s != null) { obj.s.split(',').forEach(id => { sum += obj[id] ? +obj[id] : 0; }); } return `${100 - sum}|${sum !== 100}`;",
        "{\"s\":\"a,b\",\"a\":20,\"b\":30}",
        "string?",
        "\"50|true\""
    )]
    [InlineData("return parseInt(obj.s) + parseInt(obj.t);", "{\"s\":\"12\",\"t\":\"3\"}", "string?", "\"15\"")]
    [InlineData("if (obj.s == 1) { return obj.a; } return 0;", "{\"s\":\"1\",\"a\":7}", "decimal?", "7")]
    [InlineData(
        "if (!obj.s.includes('.')) return obj.s + '.00'; return obj.s;",
        "{\"s\":\"12\"}",
        "string?",
        "\"12.00\""
    )]
    [InlineData(
        "if (!+obj.a || !+obj.b) return; return ((obj.a * obj.b) / 100).toString();",
        "{\"a\":50}",
        "string?",
        "null"
    )]
    [InlineData(
        "obj.s = obj.s ? obj.s + ' ' : ''; obj.t = obj.t ? obj.t : ''; return obj.s + obj.t;",
        "{\"s\":\"Kari\",\"t\":\"Nordmann\"}",
        "string?",
        "\"Kari Nordmann\""
    )]
    public async Task GeneratedProcessor_ProducesThePlausibleResult(
        string body,
        string inputs,
        string type,
        string expected
    )
    {
        var result = await Execute(
            body,
            Required(JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(inputs)),
            type
        );
        Assert.Equal(expected, JsonSerializer.Serialize(result));
    }

    [Fact]
    public async Task FailingRule_KeepsTheCurrentValue()
    {
        // Decimal division by zero throws; the legacy rule's result is not written.
        var result = await Execute(
            "return obj.a / obj.b;",
            new() { ["a"] = JsonDocument.Parse("1").RootElement },
            "decimal?"
        );
        Assert.Equal(19m, result);
    }

    [Fact]
    public void UnsupportedRule_IsLeftForManualConversion()
    {
        var generated = Generate("const helper = n => n; return helper(obj.a);", "decimal?");
        Assert.Equal(0, generated.SuccessfulConversions);
        Assert.Contains("TODO: Manual conversion required", generated.GeneratedCode);
    }

    [Theory]
    [InlineData("missing", "totals.result")]
    [InlineData("a", "missing")]
    public void UnresolvedModelPaths_AreLeftForManualConversion(string input, string output)
    {
        var generated = Generate("return obj.a;", "decimal?", input, output);
        Assert.Equal(0, generated.SuccessfulConversions);
        Assert.Contains("missing", Assert.Single(generated.FailedRules).Reason);
    }

    [Fact]
    public void UnicodeLayoutNames_DoNotOverwriteAnAsciiLayoutProcessor()
    {
        Assert.NotEqual(
            CSharpCodeGenerator.ProcessorClassName("skjema"),
            CSharpCodeGenerator.ProcessorClassName("skjema-ø")
        );
    }

    private static string Model(string type) =>
        $$"""
            namespace TestModels
            {
                public class Root
                {
                    public decimal? a { get; set; }
                    public decimal? b { get; set; }
                    public string? s { get; set; }
                    public string? t { get; set; }
                    public Totals? totals { get; set; }
                }
                public class Totals { public {{type}} result { get; set; } }
            }
            """;

    private static DataProcessorGenerationResult Generate(
        string body,
        string type,
        string input = "a",
        string output = "totals.result"
    )
    {
        using var app = new TempAppFolder();
        return Generate(
            app,
            body,
            type,
            new()
            {
                ["a"] = input,
                ["b"] = "b",
                ["s"] = "s",
                ["t"] = "t",
            },
            output
        );
    }

    private static DataProcessorGenerationResult Generate(
        TempAppFolder app,
        string body,
        string type,
        Dictionary<string, string> inputs,
        string output
    )
    {
        app.Write("models/Root.cs", Model(type));
        var parser = new RuleHandlerParser(
            app.Write(
                "ui/form/RuleHandler.js",
                "var ruleHandlerObject = { calculate: function(obj) { " + body + " } };"
            )
        );
        parser.Parse();
        var model = new DataModelInfo
        {
            DataType = "model",
            ClassName = "Root",
            Namespace = "TestModels",
            FullClassRef = "TestModels.Root",
        };
        var resolver = new DataModelTypeResolver(app.Root);
        Assert.True(resolver.LoadDataModelType(model));
        var rule = new DataProcessingRule
        {
            SelectedFunction = "calculate",
            InputParams = inputs,
            OutParams = new() { ["outParam0"] = output },
        };
        return new CSharpCodeGenerator("form", model, new() { ["first"] = rule }, parser, resolver).Generate();
    }

    private static async Task<object?> Execute(string body, Dictionary<string, JsonElement> inputs, string type)
    {
        using var app = new TempAppFolder();
        var generated = Generate(
            app,
            body,
            type,
            new()
            {
                ["a"] = "a",
                ["b"] = "b",
                ["s"] = "s",
                ["t"] = "t",
            },
            "totals.result"
        );
        Assert.True(
            generated.SuccessfulConversions == 1,
            string.Join("\n", generated.FailedRules.Select(rule => rule.Reason))
        );
        var source = Assert.IsType<string>(generated.GeneratedCode);
        var references = (
            (string?)AppContext.GetData("TRUSTED_PLATFORM_ASSEMBLIES") ?? throw new InvalidOperationException()
        )
            .Split(Path.PathSeparator)
            .Select(file => MetadataReference.CreateFromFile(file));
        var compilation = CSharpCompilation.Create(
            "Rules_" + Guid.NewGuid().ToString("N"),
            [
                CSharpSyntaxTree.ParseText(source),
                CSharpSyntaxTree.ParseText(Model(type)),
                CSharpSyntaxTree.ParseText(Sdk),
            ],
            references,
            new CSharpCompilationOptions(
                OutputKind.DynamicallyLinkedLibrary,
                nullableContextOptions: NullableContextOptions.Enable
            )
        );
        using var stream = new MemoryStream();
        var emitted = compilation.Emit(stream);
        Assert.True(emitted.Success, string.Join("\n", emitted.Diagnostics) + "\n" + source);
        var assembly = Assembly.Load(stream.ToArray());
        var root = Required(Activator.CreateInstance(Required(assembly.GetType("TestModels.Root"))));
        var totals = Required(Activator.CreateInstance(Required(assembly.GetType("TestModels.Totals"))));
        var result = Required(totals.GetType().GetProperty("result"));
        result.SetValue(totals, type.StartsWith("decimal", StringComparison.Ordinal) ? 19m : null);
        Required(root.GetType().GetProperty("totals")).SetValue(root, totals);
        foreach (var (name, value) in inputs)
        {
            var property = Required(root.GetType().GetProperty(name));
            property.SetValue(root, value.ValueKind == JsonValueKind.Number ? value.GetDecimal() : value.GetString());
        }
        var run = Required(Required(assembly.GetType("Entry")).GetMethod("Run"));
        await Required((Task?)run.Invoke(null, [root]));
        return result.GetValue(totals);
    }

    private static T Required<T>(T? value)
        where T : class => value ?? throw new InvalidOperationException("Missing test value.");

    // What the upgraded project provides: SDK implicit usings and the App.Core types the processor uses.
    private const string Sdk = """
        global using System;
        global using System.Collections.Generic;
        global using System.Linq;
        global using System.Threading.Tasks;
        global using Altinn.App.Core.Features;
        namespace Altinn.App.Core.Features {
            public interface IInstanceDataMutator { }
            public interface IDataWriteProcessor { }
            public interface IDataProcessor {
                Task ProcessDataRead(Altinn.Platform.Storage.Interface.Models.Instance instance, Guid? dataId, object data, string? language);
                Task ProcessDataWrite(Altinn.Platform.Storage.Interface.Models.Instance instance, Guid? dataId, object data, object? previousData, string? language);
            }
        }
        namespace Altinn.Platform.Storage.Interface.Models { public class Instance { } }
        namespace Altinn.App.Core.Models {
            public enum ChangeType { Created, Updated }
            public class Change { public object CurrentFormData { get; set; } = null!; public ChangeType Type { get; set; } }
            public class DataElementChanges { public List<Change> FormDataChanges { get; } = new(); }
        }
        public static class Entry {
            public static Task Run(object model) =>
                new Altinn.App.Logic.ConvertedLegacyRules.FormDataProcessor(
                    Microsoft.Extensions.Logging.Abstractions.NullLogger<Altinn.App.Logic.ConvertedLegacyRules.FormDataProcessor>.Instance
                ).ProcessDataWrite(new(), null, model, null, null);
        }
        """;
}

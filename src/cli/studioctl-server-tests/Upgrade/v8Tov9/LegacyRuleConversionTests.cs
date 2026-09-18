using System.Reflection;
using System.Text.Json;
using Altinn.Studio.Cli.Upgrade.v8Tov9.RuleConfiguration;
using Altinn.Studio.Cli.Upgrade.v8Tov9.RuleConfiguration.DataProcessingRules;
using Altinn.Studio.Cli.Upgrade.v8Tov9.RuleConfiguration.Models;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;

namespace Studioctl.Tests.Upgrade.v8Tov9;

public sealed class LegacyRuleConversionTests
{
    [Theory]
    [InlineData("return 100 - (obj.a + obj.b);", "{\"a\":20,\"b\":30}", "50")]
    [InlineData(
        "return (obj.total + obj.extra) - (obj.a + obj.b);",
        "{\"total\":100,\"extra\":20,\"a\":10,\"b\":20}",
        "90"
    )]
    [InlineData("if (obj.a > 0 && obj.b > 0) { return obj.b; } return null;", "{\"a\":2,\"b\":1.5}", "1.5")]
    [InlineData("if (obj.a > 0 && obj.b > 0) { return obj.b; } return null;", "{\"a\":0,\"b\":1.5}", "null")]
    [InlineData("if (obj.a == null) return 0; return obj.a < 100 ? 2 : 1;", "{\"a\":null}", "0")]
    [InlineData("obj.a = obj.a ? +obj.a : 0; return obj.a + 1;", "{\"a\":\"2.5\"}", "3.5")]
    [InlineData(
        "return obj.a + obj.b ? Math.round((obj.a + obj.b) * 100) / 100 : 0;",
        "{\"a\":-1.125,\"b\":0}",
        "-1.12"
    )]
    [InlineData("return parseFloat(obj.a.toFixed(2));", "{\"a\":2.675}", "2.67")]
    [InlineData("return parseFloat(obj.a.toFixed(2));", "{\"a\":0.125}", "0.13")]
    [InlineData("return Math.round(obj.a);", "{\"a\":0.49999999999999994}", "0")]
    [InlineData("return obj.a == 1 ? 10 : 20;", "{\"a\":\"1\"}", "10")]
    [InlineData("var $sum = obj.a + obj.b; return $sum;", "{\"a\":1,\"b\":2}", "3")]
    [InlineData("return obj.a < obj.b ? 1 : 0;", "{\"a\":\"10\",\"b\":\"2\"}", "1")]
    [InlineData("if (obj.a > 0) { var result = 12; } else { result = 7; } return result;", "{\"a\":1}", "12")]
    [InlineData("return obj.a || 7;", "{\"a\":0}", "7")]
    [InlineData("return obj.a && 7;", "{\"a\":2}", "7")]
    public async Task GeneratedProcessor_CompilesAndPreservesPrimitiveSemantics(
        string body,
        string inputs,
        string expected
    )
    {
        var values =
            JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(inputs)
            ?? throw new InvalidOperationException();
        var args = values.ToDictionary(
            pair => pair.Key,
            pair =>
                pair.Value.ValueKind switch
                {
                    JsonValueKind.Null => null,
                    JsonValueKind.String => (object?)pair.Value.GetString(),
                    _ => pair.Value.GetDouble(),
                }
        );
        var actual = await Execute(body, args);
        Assert.Equal(expected, JsonSerializer.Serialize(actual));
    }

    [Fact]
    public async Task SharedSum_WithTwelvePropertiesAndOmittedParameters_ConvertsWithoutStub()
    {
        var keys = "abcdefghijkl".Select(c => c.ToString()).ToArray();
        var body =
            string.Join("\n", keys.Select(key => $"obj.{key} = obj.{key} ? +obj.{key} : 0;"))
            + "return "
            + string.Join(" + ", keys.Select(key => "obj." + key))
            + ";";
        // Two mappings share one JS function; unused g..l must retain their zero defaults.
        var actual = await Execute(body, new() { ["a"] = 20m, ["b"] = 30m }, shared: true);
        Assert.Equal(50d, actual);
    }

    [Theory]
    [InlineData("1", 0, 100)]
    [InlineData("2", 0, 200)]
    [InlineData("2", 1, 2)]
    [InlineData("2", 1, 0, 0)]
    public async Task SharedPeriodRule_WithSixteenProperties_PreservesBranchesAndDenominatorGuard(
        string period,
        double ratio,
        double expected,
        double previous = 100
    )
    {
        var keys = "abcdefghijkl".Select(c => c.ToString()).ToArray();
        var body =
            string.Join("\n", keys.Select(key => $"obj.{key} = obj.{key} ? +obj.{key} : 0;"))
            + """
                obj.previous = obj.previous ? +obj.previous : 0;
                obj.period = obj.period ? +obj.period : 0;
                obj.ratio = obj.ratio ? +obj.ratio : 0;
                obj.accumulated = obj.accumulated ? +obj.accumulated : 0;
                var total = obj.a + obj.accumulated;
                if (obj && obj.period != 1) total = total + obj.b;
                var difference = total - obj.previous;
                if (difference < 0) difference = difference * -1;
                if (obj.ratio != 0) {
                    var result = 0;
                    if (obj.previous > 0) result = difference / obj.previous;
                    return result;
                }
                return difference;
                """;
        var actual = await Execute(
            body,
            new()
            {
                ["a"] = 200m,
                ["b"] = 100m,
                ["period"] = period,
                ["ratio"] = ratio,
                ["previous"] = previous,
            },
            shared: true
        );
        Assert.Equal(expected, actual);
    }

    [Fact]
    public async Task NonNumericModelValues_AreTruthyAndDoNotThrowOnNumericCoercion()
    {
        // These are raw model values, not JavaScript Date instances created by rule code.
        foreach (var value in new object[] { DateTime.UnixEpoch, Guid.Empty, new object() })
        {
            Assert.Equal(1d, await Execute("return obj.a ? 1 : 0;", new() { ["a"] = value }));
            var number = Assert.IsType<double>(await Execute("return +obj.a;", new() { ["a"] = value }));
            Assert.True(double.IsNaN(number));
        }
    }

    [Theory]
    [InlineData("missing", "result", false)]
    [InlineData("a", "missing", false)]
    [InlineData("a", "result", true)]
    public void ModelPaths_AreValidatedBeforePrimitiveGeneration(string inputPath, string outputPath, bool valid)
    {
        using var app = new TempAppFolder();
        app.Write(
            "App/models/Root.cs",
            "namespace TestModels { public class Root { public double a { get; set; } public double result { get; set; } } }"
        );
        var parser = new RuleHandlerParser(
            app.Write(
                "ui/form/RuleHandler.js",
                "var ruleHandlerObject = { calculate: function(obj) { return obj.a + 1; } };"
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
        var resolver = new DataModelTypeResolver(Path.Combine(app.Root, "App"));
        Assert.True(resolver.LoadDataModelType(model));
        Assert.NotNull(resolver.ResolveType("a"));
        Assert.NotNull(resolver.ResolveType("result"));
        var rule = new DataProcessingRule
        {
            SelectedFunction = "calculate",
            InputParams = new() { ["a"] = inputPath },
            OutParams = new() { ["outParam0"] = outputPath },
        };
        var result = new CSharpCodeGenerator("form", model, new() { ["first"] = rule }, parser, resolver).Generate();
        if (valid)
        {
            Assert.Equal(1, result.SuccessfulConversions);
            Assert.Equal(0, result.FailedConversions);
            Assert.Contains("JsNumber", Assert.IsType<string>(result.GeneratedCode));
        }
        else
        {
            Assert.Equal(0, result.SuccessfulConversions);
            Assert.Equal(1, result.FailedConversions);
            Assert.Contains("missing", Assert.Single(result.FailedRules).Reason);
            Assert.DoesNotContain("JsNumber", Assert.IsType<string>(result.GeneratedCode));
        }
    }

    private static async Task<object?> Execute(string body, Dictionary<string, object?> inputs, bool shared = false)
    {
        using var app = new TempAppFolder();
        var path = app.Write(
            "ui/form/RuleHandler.js",
            "var ruleHandlerObject = { calculate: function(obj) { " + body + " } };"
        );
        var parser = new RuleHandlerParser(path);
        parser.Parse();
        var rule = new DataProcessingRule
        {
            SelectedFunction = "calculate",
            InputParams = inputs.Keys.ToDictionary(key => key, key => key),
            OutParams = new() { ["outParam0"] = "result" },
        };
        var rules = new Dictionary<string, DataProcessingRule> { ["first"] = rule };
        if (shared)
            rules.Add("second", rule);
        var generated = new CSharpCodeGenerator(
            "form",
            new DataModelInfo
            {
                DataType = "model",
                ClassName = "Root",
                Namespace = "TestModels",
                FullClassRef = "TestModels.Root",
            },
            rules,
            parser
        ).Generate();
        Assert.True(generated.Success, string.Join("\n", generated.Errors));
        Assert.Equal(rules.Count, generated.SuccessfulConversions);
        Assert.Equal(0, generated.FailedConversions);
        var source = Assert.IsType<string>(generated.GeneratedCode);
        Assert.Contains("JsNumber", source);
        Assert.DoesNotContain("NotImplementedException", source);
        var references = (
            (string?)AppContext.GetData("TRUSTED_PLATFORM_ASSEMBLIES") ?? throw new InvalidOperationException()
        )
            .Split(Path.PathSeparator)
            .Select(file => MetadataReference.CreateFromFile(file));
        var compilation = CSharpCompilation.Create(
            "Rules_" + Guid.NewGuid().ToString("N"),
            [CSharpSyntaxTree.ParseText(source), CSharpSyntaxTree.ParseText(Sdk)],
            references,
            new CSharpCompilationOptions(OutputKind.DynamicallyLinkedLibrary)
        );
        using var stream = new MemoryStream();
        var emitted = compilation.Emit(stream);
        Assert.True(emitted.Success, string.Join("\n", emitted.Diagnostics));
        var assembly = Assembly.Load(stream.ToArray());
        var run = assembly.GetType("Entry")?.GetMethod("Run") ?? throw new InvalidOperationException();
        var task = Assert.IsType<Task<object?>>(run.Invoke(null, [inputs]));
        return await task;
    }

    // This deliberately models v9's ExpressionValue-only Set contract, not the removed object overload.
    private const string Sdk = """
        using System;
        using System.Collections.Generic;
        using System.Threading.Tasks;
        using Altinn.App.Core.Internal.Expressions;
        namespace TestModels { public class Root { } }
        namespace Altinn.App.Core.Internal.Expressions {
            public readonly record struct ExpressionValue(object? Value) {
                public static ExpressionValue FromObject(object? value) => new(value);
            }
        }
        namespace Altinn.App.Core.Features {
            public interface IInstanceDataMutator { }
            public interface IDataWriteProcessor { }
        }
        namespace Altinn.App.Core.Internal.Data {
            public interface IFormDataWrapper { object? Get(ReadOnlySpan<char> path); bool Set(ReadOnlySpan<char> path, ExpressionValue value); }
        }
        namespace Altinn.App.Core.Models {
            public class Change { public object CurrentFormData { get; } = new TestModels.Root();
                public Altinn.App.Core.Internal.Data.IFormDataWrapper CurrentFormDataWrapper { get; set; } = null!; }
            public class DataElementChanges { public List<Change> FormDataChanges { get; } = new(); }
        }
        public class Store(Dictionary<string, object?> inputs) : Altinn.App.Core.Internal.Data.IFormDataWrapper {
            public object? Result;
            public object? Get(ReadOnlySpan<char> path) => inputs.GetValueOrDefault(path.ToString());
            public bool Set(ReadOnlySpan<char> path, ExpressionValue value) { Result = value.Value; return true; }
        }
        public static class Entry {
            public static async Task<object?> Run(Dictionary<string, object?> inputs) {
                var store = new Store(inputs);
                var changes = new Altinn.App.Core.Models.DataElementChanges();
                changes.FormDataChanges.Add(new() { CurrentFormDataWrapper = store });
                await new Altinn.App.Logic.ConvertedLegacyRules.FormDataProcessor().ProcessDataWrite(null!, "task", changes, null);
                return store.Result;
            }
        }
        """;
}

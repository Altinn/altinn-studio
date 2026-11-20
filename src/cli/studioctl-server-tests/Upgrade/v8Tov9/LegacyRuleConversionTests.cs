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
    [InlineData("return obj.a * obj.b;", "{\"a\":1e20,\"b\":1e10}", "1E+30")]
    [InlineData("var total = obj.a; total *= obj.b; return total;", "{\"a\":1e20,\"b\":1e10}", "1E+30")]
    [InlineData("obj.flag = obj.flag ? +obj.flag : 0; return obj.a * obj.flag;", "{\"a\":100,\"flag\":\"2.5\"}", "250")]
    [InlineData("return 100 - (obj.a + obj.b);", "{\"a\":20,\"b\":30}", "50")]
    [InlineData("return obj.b ? (obj.a / obj.b) * obj.b : 0;", "{\"a\":10,\"b\":1e-28}", "10")]
    [InlineData("return (1e-28 / 10) * 1e28;", "{\"a\":0}", "0.09999999999999999")]
    [InlineData("return (3e-28 / 2) * 1e28;", "{\"a\":0}", "1.5")]
    [InlineData("return ((7.922816251426434e27 / 0.1) * 0.1) / 1e27;", "{\"a\":0}", "7.922816251426434")]
    [InlineData("return (0.1 / 1e-29) / 1e28;", "{\"a\":0}", "1.0000000000000002")]
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
    [InlineData("return obj.a.split(',').toString();", "{\"a\":\"yes,no\"}", "\"yes,no\"")]
    [InlineData(
        "var total = 0; obj.a.split(',').forEach(part => { const twice = n => +n * 2; total += twice(part); }); return total;",
        "{\"a\":\"1,2\"}",
        "6"
    )]
    [InlineData("return Math.round(obj.a);", "{\"a\":0.49999999999999994}", "0")]
    [InlineData("return Math.round(obj.a);", "{\"a\":-2.5}", "-2")]
    [InlineData("return Math.round(obj.a);", "{\"a\":2.5}", "3")]
    [InlineData("return obj.a == 1 ? 10 : 20;", "{\"a\":\"1\"}", "10")]
    [InlineData("return obj.a.split(',').includes('yes');", "{\"a\":\"no,yes\"}", "true")]
    [InlineData("return obj.a.split(',').includes('yes');", "{\"a\":\"yesterday,no\"}", "false")]
    [InlineData("return obj.a.split(',').includes(1);", "{\"a\":\"1,2\"}", "false")]
    [InlineData("return obj.a.includes('yes');", "{\"a\":\"yesterday\"}", "true")]
    [InlineData("return obj.a?.includes(obj.b.trim()) ? 1 : 0;", "{\"a\":null,\"b\":null}", "0")]
    [InlineData("total = obj.a; var total; return total / obj.b;", "{\"a\":6,\"b\":2}", "3")]
    [InlineData(
        "var total = 0; obj.a.split(',').forEach(part => { if (part) { const amount = +part; total += amount; } }); return total;",
        "{\"a\":\"1,,2\"}",
        "3"
    )]
    [InlineData(
        "var total = 0; obj.a.split(',').forEach(part => { part = part.trim(); total += +part; }); return total;",
        "{\"a\":\" 1 ,2\"}",
        "3"
    )]
    [InlineData(
        "var total = 0; obj.a.split(',').forEach(part => { amount = +part; var amount; total += amount; }); return total;",
        "{\"a\":\"1,2\"}",
        "3"
    )]
    [InlineData("return Number('0x20000000000003') === 9007199254740996 ? 1 : 0;", "{\"a\":0}", "1")]
    [InlineData("var $sum = obj.a + obj.b; return $sum;", "{\"a\":1,\"b\":2}", "3")]
    [InlineData("return obj.a < obj.b ? 1 : 0;", "{\"a\":\"10\",\"b\":\"2\"}", "1")]
    [InlineData("if (obj.a > 0) { var result = 12; } else { result = 7; } return result;", "{\"a\":1}", "12")]
    [InlineData("return obj.a || 7;", "{\"a\":0}", "7")]
    [InlineData("return obj.a && 7;", "{\"a\":2}", "7")]
    [InlineData("return obj.missing < 1 ? 1 : 0;", "{\"a\":1}", "0")]
    [InlineData("return obj.a < 1 ? 1 : 0;", "{\"a\":null}", "1")]
    [InlineData("return obj.missing ? 1 : 0;", "{\"a\":1}", "0")]
    [InlineData("return obj.missing == null ? 1 : 0;", "{\"a\":1}", "1")]
    [InlineData("return obj.missing == undefined ? 1 : 0;", "{\"a\":1}", "1")]
    [InlineData("return obj.missing + 'x';", "{\"a\":1}", "\"undefinedx\"")]
    [InlineData("return obj.a + 'x';", "{\"a\":null}", "\"nullx\"")]
    [InlineData("return obj.missing;", "{\"a\":1}", "null")]
    [InlineData("var value; return value < 1 ? 1 : 0;", "{\"a\":1}", "0")]
    [InlineData("return obj.a === obj.b ? 1 : 0;", "{\"a\":2,\"b\":\"2\"}", "0")]
    [InlineData("return obj.a?.toString() ?? 'empty';", "{\"a\":null}", "\"empty\"")]
    [InlineData("return obj.a?.toString() ?? 'empty';", "{\"a\":2.5}", "\"2.5\"")]
    [InlineData("return obj.a?.length ?? 7;", "{\"a\":null}", "7")]
    [InlineData("return obj.a?.length ?? 7;", "{\"a\":\"abc\"}", "3")]
    [InlineData("return obj.a ?? 7;", "{\"a\":0}", "0")]
    [InlineData("var x = obj.a; x += 3; x *= 2; return x;", "{\"a\":4}", "14")]
    [InlineData(
        "var total = 0; obj.a.split(',').forEach(v => { total += Number(v); }); return total;",
        "{\"a\":\"1,2,3\"}",
        "6"
    )]
    [InlineData("return `${obj.a}|${obj.b}`;", "{\"a\":0,\"b\":false}", "\"0|false\"")]
    [InlineData("return obj.a.toFixed(undefined);", "{\"a\":2.5}", "\"3\"")]
    [InlineData("return obj.a.toFixed(-0.5);", "{\"a\":2.5}", "\"3\"")]
    [InlineData("return parseInt(obj.a);", "{\"a\":\"0x10tail\"}", "16")]
    [InlineData("return Number(obj.a);", "{\"a\":\"0b110\"}", "6")]
    [InlineData("return /^\\d+$/.test(obj.a) ? obj.a + ',-' : obj.a;", "{\"a\":\"123\"}", "\"123,-\"")]
    [InlineData("return /^\\d+$/.test(obj.a) ? obj.a + ',-' : obj.a;", "{\"a\":\"123\\n\"}", "\"123\\n\"")]
    [InlineData("if (true) { return obj.a; } return 0;", "{\"a\":3}", "3")]
    [InlineData("if (false) return 0; else return obj.a;", "{\"a\":3}", "3")]
    [InlineData("return obj.a > obj.b * 1.4 ? 1 : 0;", "{\"a\":7002.8,\"b\":5002}", "1")]
    [InlineData("return obj.a > obj.b * 24000 ? 1 : 0;", "{\"a\":3360,\"b\":0.14}", "0")]
    [InlineData("return obj.a + obj.b === 0.3 ? 1 : 0;", "{\"a\":0.1,\"b\":0.2}", "0")]
    [InlineData("if (obj.a) { const value = Number(obj.a); return value + 1; } return 0;", "{\"a\":2}", "3")]
    [InlineData("return Number.isFinite(obj.a) ? 1 : 0;", "{\"a\":\"12\"}", "0")]
    [InlineData("return Number.isFinite(obj.a) ? 1 : 0;", "{\"a\":12}", "1")]
    [InlineData("return obj.b ? (obj.a / obj.b < 0.4 ? 1 : 0) : 0;", "{\"a\":0.04,\"b\":0.1}", "1")]
    [InlineData("return (obj.a + obj.b).toString();", "{\"a\":0.1,\"b\":0.2}", "\"0.30000000000000004\"")]
    [InlineData(
        "const toNumber = val => { const num = Number(val); return isNaN(num) ? 0 : num; }; return String(toNumber(obj.a) + toNumber(obj.b));",
        "{\"a\":0.1,\"b\":0.2}",
        "\"0.30000000000000004\""
    )]
    [InlineData(
        "const selected = obj.a.split(','); let sum = 0; selected.forEach(id => { sum += +obj[`val${id}`]; }); return `${100 - sum}|${sum !== 100 && selected.every(id => obj[`val${id}`] != null)}`;",
        "{\"a\":\"0,1\",\"val0\":20.1,\"val1\":79.8}",
        "\"0.09999999999999432|true\""
    )]
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
                    JsonValueKind.True => true,
                    JsonValueKind.False => false,
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
    public async Task NonScalarModelValues_AreNormalizedToNullByTheLegacyBinding()
    {
        // These are raw model values, not JavaScript Date instances created by rule code.
        foreach (var value in new object[] { DateTime.UnixEpoch, Guid.Empty, new object() })
        {
            Assert.Equal(0d, await Execute("return obj.a ? 1 : 0;", new() { ["a"] = value }));
            var number = Assert.IsType<double>(await Execute("return +obj.a;", new() { ["a"] = value }));
            Assert.Equal(0d, number);
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

    [Fact]
    public async Task UnconfiguredPropertyProducesNaN_AndClearsThePreviousModelValue()
    {
        var value = await Execute("return obj.a + obj.missing;", new() { ["a"] = 1d }, shared: true);
        Assert.Null(value);
    }

    [Fact]
    public async Task Rules_ReadTheSameSnapshotBeforeAnyOfTheirWrites()
    {
        var actual = await Execute("return obj.a + 1;", new() { ["a"] = 1d }, secondBody: "return obj.a + 1;");
        Assert.Equal([2d, 20d], Assert.IsType<object?[]>(actual));
    }

    [Fact]
    public async Task UnsupportedRule_DoesNotBlockAnIndependentConvertedRule()
    {
        Assert.Equal(4d, await Execute("return obj.a + 1;", new() { ["a"] = 3d }, unsupported: true));
    }

    [Theory]
    [InlineData("obj = obj.a; return obj;")]
    [InlineData("return 1e309;")]
    [InlineData("return -1e309;")]
    [InlineData("return helper(obj.a); const helper = value => value;")]
    [InlineData("const extra = obj.b; const helper = value => value + extra; return helper(obj.a);")]
    [InlineData("const Number = value => 7; const helper = value => Number(value); return helper(obj.a);")]
    [InlineData("const helper = value => value; helper = 7; return helper(obj.a);")]
    [InlineData("return obj.a.split(',').every(Number => Number('1'));")]
    [InlineData("if (obj.a) { const value = 1; } return value;")]
    [InlineData("return value; let value = 1;")]
    [InlineData("value = 1; let value;")]
    [InlineData("const value = 1; value = 2; return value;")]
    [InlineData(
        "var total = 0; obj.a.split(',').forEach(part => { if (part === '') return; total += +part; }); return total;"
    )]
    [InlineData("let total = 0; const add = n => { total = n; return n; }; add(obj.a); return total;")]
    public void UnsupportedAssignmentsAndHelperScopes_AreRejectedByPrimitiveConverter(string body)
    {
        using var app = new TempAppFolder();
        var parser = new RuleHandlerParser(
            app.Write(
                "ui/form/RuleHandler.js",
                "var ruleHandlerObject = { calculate: function(obj) { " + body + " } };"
            )
        );
        parser.Parse();
        var function = parser.GetDataProcessingFunction("calculate") ?? throw new InvalidOperationException();
        var ast = Assert.IsAssignableFrom<Acornima.Ast.IFunction>(function.FunctionAst);
        Assert.Throws<NotSupportedException>(() => new PrimitiveRuleConverter("obj").Convert(ast));
    }

    [Fact]
    public async Task NumberInputParameter_ShadowsTheGlobalNumberObject()
    {
        Assert.Equal(
            4d,
            await Execute(
                "return Number.MAX_SAFE_INTEGER / Number.divisor;",
                new() { ["MAX_SAFE_INTEGER"] = 12d, ["divisor"] = 3d },
                parameterName: "Number"
            )
        );
    }

    [Theory]
    [InlineData("\u0085")]
    [InlineData("\u2028")]
    [InlineData("\u2029")]
    public async Task RetainedSourceComments_CannotEndAtUnicodeLineSeparators(string separator)
    {
        Assert.Equal(
            4d,
            await Execute("return obj.a + 1;", new() { ["a"] = 3d }, ruleId: "first" + separator + "not C# code")
        );
    }

    [Fact]
    public void UnicodeLayoutNames_DoNotOverwriteAnAsciiLayoutProcessor()
    {
        Assert.NotEqual(
            CSharpCodeGenerator.ProcessorClassName("skjema"),
            CSharpCodeGenerator.ProcessorClassName("skjema-ø")
        );
    }

    private static async Task<object?> Execute(
        string body,
        Dictionary<string, object?> inputs,
        bool shared = false,
        string? secondBody = null,
        bool unsupported = false,
        string parameterName = "obj",
        string ruleId = "first"
    )
    {
        using var app = new TempAppFolder();
        var path = app.Write(
            "ui/form/RuleHandler.js",
            "var ruleHandlerObject = { calculate: function("
                + parameterName
                + ") { "
                + body
                + " }, second: function(obj) { "
                + (secondBody ?? body)
                + " }, bad: function(obj) { while (obj.a) {} return obj.a; } };"
        );
        var parser = new RuleHandlerParser(path);
        parser.Parse();
        var rule = new DataProcessingRule
        {
            SelectedFunction = "calculate",
            InputParams = inputs.Keys.ToDictionary(key => key, key => key),
            OutParams = new() { ["outParam0"] = "result" },
        };
        var rules = new Dictionary<string, DataProcessingRule>();
        if (unsupported)
            rules.Add(
                "bad",
                new()
                {
                    SelectedFunction = "bad",
                    InputParams = rule.InputParams,
                    OutParams = rule.OutParams,
                }
            );
        rules.Add(ruleId, rule);
        if (shared)
            rules.Add("second", rule);
        if (secondBody != null)
            rules.Add(
                "second",
                new()
                {
                    SelectedFunction = "second",
                    InputParams = new() { ["a"] = "result" },
                    OutParams = new() { ["outParam0"] = "other" },
                }
            );
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
        Assert.Equal(rules.Count - (unsupported ? 1 : 0), generated.SuccessfulConversions);
        Assert.Equal(unsupported ? 1 : 0, generated.FailedConversions);
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
            [
                CSharpSyntaxTree.ParseText(source),
                CSharpSyntaxTree.ParseText(Sdk),
                CSharpSyntaxTree.ParseText(ProjectGlobalUsings),
            ],
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

    // What the upgraded project imports in every file: the SDK's implicit usings the generated code
    // relies on, plus the Altinn.App.Core.Features global using the v9 upgrade adds to App.csproj.
    private const string ProjectGlobalUsings = """
        global using System;
        global using System.Collections.Generic;
        global using System.Linq;
        global using System.Threading.Tasks;
        global using Altinn.App.Core.Features;
        """;

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
            public interface IFormDataWrapper { object? Get(ReadOnlySpan<char> path); bool Set(ReadOnlySpan<char> path, ExpressionValue value); IFormDataWrapper Copy(); }
        }
        namespace Altinn.App.Core.Models {
            public class Change { public object CurrentFormData { get; } = new TestModels.Root();
                public Altinn.App.Core.Internal.Data.IFormDataWrapper CurrentFormDataWrapper { get; set; } = null!; }
            public class DataElementChanges { public List<Change> FormDataChanges { get; } = new(); }
        }
        public class Store(Dictionary<string, object?> inputs) : Altinn.App.Core.Internal.Data.IFormDataWrapper {
            public object? Result = 19d;
            public object? OtherResult;
            public object? Get(ReadOnlySpan<char> path) => path.ToString() == "result" ? Result : inputs.GetValueOrDefault(path.ToString());
            public bool Set(ReadOnlySpan<char> path, ExpressionValue value) {
                if (path.SequenceEqual("other")) OtherResult = value.Value;
                else Result = value.Value;
                return true;
            }
            public Altinn.App.Core.Internal.Data.IFormDataWrapper Copy() => new Store(new(inputs)) { Result = Result };
        }
        public static class Entry {
            public static async Task<object?> Run(Dictionary<string, object?> inputs) {
                var store = new Store(inputs);
                var changes = new Altinn.App.Core.Models.DataElementChanges();
                changes.FormDataChanges.Add(new() { CurrentFormDataWrapper = store });
                await new Altinn.App.Logic.ConvertedLegacyRules.FormDataProcessor(
                    Microsoft.Extensions.Logging.Abstractions.NullLogger<Altinn.App.Logic.ConvertedLegacyRules.FormDataProcessor>.Instance
                ).ProcessDataWrite(null!, "task", changes, null);
                return store.OtherResult is null ? store.Result : new object?[] { store.Result, store.OtherResult };
            }
        }
        """;
}

#nullable enable
using System.Reflection;
using System.Text.Json;

using Altinn.App.Core.Internal.Expressions;
using Altinn.App.Core.Tests.Helpers;
using FluentAssertions;
using Xunit;
using Xunit.Abstractions;
using Xunit.Sdk;

namespace Altinn.App.Core.Tests.LayoutExpressions;

public class TestBackendExclusiveFunctions
{
    private readonly ITestOutputHelper _output;

    public TestBackendExclusiveFunctions(ITestOutputHelper output)
    {
        _output = output;
    }
    
    [Theory]
    [ExclusiveTest("gatewayAction")]
    public void GatewayAction_Theory(ExpressionTestCaseRoot test) => RunTestCase(test);

    private void RunTestCase(ExpressionTestCaseRoot test)
    {
        _output.WriteLine($"{test.Filename} in {test.Folder}");
        _output.WriteLine(test.RawJson);
        _output.WriteLine(test.FullPath);
        var state = new LayoutEvaluatorState(
            new JsonDataModel(test.DataModel),
            test.ComponentModel,
            test.FrontEndSettings ?? new(),
            test.Instance ?? new(),
            test.GatewayAction);

        if (test.ExpectsFailure is not null)
        {
            if (test.ParsingException is not null)
            {
                test.ParsingException.Message.Should().Be(test.ExpectsFailure);
            }
            else
            {
                Action act = () =>
                {
                    ExpressionEvaluator.EvaluateExpression(state, test.Expression, test.Context?.ToContext(test.ComponentModel)!);
                };
                act.Should().Throw<Exception>().WithMessage(test.ExpectsFailure);
            }

            return;
        }

        test.ParsingException.Should().BeNull("Loading of test failed");

        var result = ExpressionEvaluator.EvaluateExpression(state, test.Expression, test.Context?.ToContext(test.ComponentModel)!);

        switch (test.Expects.ValueKind)
        {
            case JsonValueKind.String:
                result.Should().Be(test.Expects.GetString());
                break;
            case JsonValueKind.True:
                result.Should().Be(true);
                break;
            case JsonValueKind.False:
                result.Should().Be(false);
                break;
            case JsonValueKind.Null:
                result.Should().Be(null);
                break;
            case JsonValueKind.Number:
                result.Should().Be(test.Expects.GetDouble());
                break;
            case JsonValueKind.Undefined:

            default:
                // Compare serialized json result for object and array
                JsonSerializer.Serialize(result).Should().Be(JsonSerializer.Serialize(test.Expects));
                break;
        }
    }

    [Fact]
    public void Ensure_tests_For_All_Folders()
    {
        // This is just a way to ensure that all folders have test methods associcated.
        var jsonTestFolders = Directory.GetDirectories(Path.Join("LayoutExpressions", "CommonTests", "exclusive-tests", "functions")).Select(d => Path.GetFileName(d)).ToArray();
        var testMethods = this.GetType().GetMethods().Select(m => m.CustomAttributes.FirstOrDefault(ca => ca.AttributeType == typeof(ExclusiveTestAttribute))?.ConstructorArguments.FirstOrDefault().Value).OfType<string>().ToArray();
        testMethods.Should().BeEquivalentTo(jsonTestFolders, "Shared test folders should have a corresponding test method");
    }
}

public class ExclusiveTestAttribute : DataAttribute
{
    private readonly string _folder;

    public ExclusiveTestAttribute(string folder)
    {
        _folder = folder;
    }

    public override IEnumerable<object[]> GetData(MethodInfo methodInfo)
    {
        var files = Directory.GetFiles(Path.Join("LayoutExpressions", "CommonTests", "exclusive-tests", "functions", _folder));
        foreach (var file in files)
        {
            ExpressionTestCaseRoot testCase = new();
            var data = File.ReadAllText(file);
            try
            {
                testCase = JsonSerializer.Deserialize<ExpressionTestCaseRoot>(
                    data,
                    new JsonSerializerOptions
                    {
                        ReadCommentHandling = JsonCommentHandling.Skip,
                        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                    })!;
            }
            catch (Exception e)
            {
                using var jsonDocument = JsonDocument.Parse(data);

                testCase.Name = jsonDocument.RootElement.GetProperty("name").GetString();
                testCase.ExpectsFailure = jsonDocument.RootElement.TryGetProperty("expectsFailure", out var expectsFailure) ? expectsFailure.GetString() : null;
                testCase.ParsingException = e;
            }

            testCase.Filename = Path.GetFileName(file);
            testCase.FullPath = file;
            testCase.Folder = _folder;
            testCase.RawJson = data;

            yield return new object[] { testCase };
        }
    }
}

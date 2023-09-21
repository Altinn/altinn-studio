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

public class TestInvalid
{
    private readonly ITestOutputHelper _output;

    public TestInvalid(ITestOutputHelper output)
    {
        _output = output;
    }

    [Theory]
    [SharedTestInvalid()]
    public void Simple_Theory(InvalidTestCase testCase)
    {
        _output.WriteLine($"{testCase.Filename} in {testCase.Folder}");
        _output.WriteLine(testCase.RawJson);
        _output.WriteLine(testCase.FullPath);
        Action act = () =>
        {
            var test = JsonSerializer.Deserialize<ExpressionTestCaseRoot>(
                testCase.RawJson!,
                new JsonSerializerOptions
                {
                    ReadCommentHandling = JsonCommentHandling.Skip,
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                })!;
            var state = new LayoutEvaluatorState(
                new JsonDataModel(test.DataModel),
                test.ComponentModel,
                test.FrontEndSettings ?? new(),
                test.Instance ?? new());
            ExpressionEvaluator.EvaluateExpression(state, test.Expression, test.Context?.ToContext(test.ComponentModel) ?? null!);
        };
        act.Should().Throw<Exception>().WithMessage(testCase.ExpectsFailure);
    }
}

public class SharedTestInvalidAttribute : DataAttribute
{
    public override IEnumerable<object[]> GetData(MethodInfo methodInfo)
    {
        var files = Directory.GetFiles(Path.Join("LayoutExpressions", "CommonTests", "shared-tests", "invalid"));
        foreach (var file in files)
        {
            var data = File.ReadAllText(file);
            using var document = JsonDocument.Parse(data);
            var testCase = new InvalidTestCase()
            {
                Name = document.RootElement.GetProperty("name").GetString(),
                ExpectsFailure = document.RootElement.GetProperty("expectsFailure").GetString(),
                Filename = Path.GetFileName(file),
                FullPath = file,
                RawJson = data,
            };

            yield return new object[] { testCase };
        }
    }
}

public class InvalidTestCase
{
    public string? Filename { get; set; }

    public string? FullPath { get; set; }

    public string? Folder { get; set; }

    public string RawJson { get; set; } = default!;

    public string? Name { get; set; }

    public string? ExpectsFailure { get; set; }

    public override string ToString()
    {
        return Name ?? "Unknown invalid test case";
    }
}

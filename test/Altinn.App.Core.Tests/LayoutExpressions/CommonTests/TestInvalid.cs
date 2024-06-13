using System.Reflection;
using System.Runtime.CompilerServices;
using System.Text.Json;
using Altinn.App.Core.Internal.Expressions;
using Altinn.App.Core.Tests.Helpers;
using Altinn.App.Core.Tests.TestUtils;
using FluentAssertions;
using Xunit.Abstractions;
using Xunit.Sdk;

namespace Altinn.App.Core.Tests.LayoutExpressions;

public class TestInvalid
{
    private static readonly JsonSerializerOptions _jsonSerializerOptions =
        new() { ReadCommentHandling = JsonCommentHandling.Skip, PropertyNamingPolicy = JsonNamingPolicy.CamelCase, };

    private readonly ITestOutputHelper _output;

    public TestInvalid(ITestOutputHelper output)
    {
        _output = output;
    }

    [Theory]
    [FileNamesInFolderData(["LayoutExpressions", "CommonTests", "shared-tests", "invalid"])]
    public void Simple_Theory(string testName, string folder)
    {
        var testCase = LoadData(testName, folder);
        _output.WriteLine($"{testCase.Filename} in {testCase.Folder}");
        _output.WriteLine(testCase.RawJson);
        _output.WriteLine(testCase.FullPath);
        Action act = () =>
        {
            var test = JsonSerializer.Deserialize<ExpressionTestCaseRoot>(testCase.RawJson!, _jsonSerializerOptions)!;
            var state = new LayoutEvaluatorState(
                new JsonDataModel(test.DataModel),
                test.ComponentModel,
                test.FrontEndSettings ?? new(),
                test.Instance ?? new()
            );
            ExpressionEvaluator.EvaluateExpression(
                state,
                test.Expression,
                test.Context?.ToContext(test.ComponentModel) ?? null!
            );
        };
        act.Should().Throw<Exception>().WithMessage(testCase.ExpectsFailure);
    }

    private static InvalidTestCase LoadData(string testName, string folder)
    {
        var data = File.ReadAllText(Path.Join(folder, testName));
        using var document = JsonDocument.Parse(data);
        return new InvalidTestCase()
        {
            Name = document.RootElement.GetProperty("name").GetString(),
            ExpectsFailure = document.RootElement.GetProperty("expectsFailure").GetString(),
            Filename = testName,
            FullPath = folder,
            RawJson = data,
        };
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

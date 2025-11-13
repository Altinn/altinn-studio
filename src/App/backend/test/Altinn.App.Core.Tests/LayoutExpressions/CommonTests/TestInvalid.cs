using System.Text.Json;
using Altinn.App.Core.Internal.Expressions;
using Altinn.App.Core.Models.Layout;
using Altinn.App.Core.Tests.LayoutExpressions.TestUtilities;
using Altinn.App.Core.Tests.TestUtils;
using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;
using Xunit.Abstractions;

namespace Altinn.App.Core.Tests.LayoutExpressions.CommonTests;

public class TestInvalid
{
    private static readonly JsonSerializerOptions _jsonSerializerOptions = new()
    {
        ReadCommentHandling = JsonCommentHandling.Skip,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    private readonly ITestOutputHelper _output;

    public TestInvalid(ITestOutputHelper output)
    {
        _output = output;
    }

    [Theory]
    [FileNamesInFolderData(["LayoutExpressions", "CommonTests", "shared-tests", "invalid"])]
    public async Task Simple_Theory(string testName, string folder)
    {
        var testCase = await LoadData(testName, folder);
        _output.WriteLine($"{testCase.Filename} in {testCase.Folder}");
        _output.WriteLine(testCase.RawJson);
        _output.WriteLine(testCase.FullPath);
        Func<Task> act = async () =>
        {
            var test = JsonSerializer.Deserialize<ExpressionTestCaseRoot>(testCase.RawJson!, _jsonSerializerOptions)!;
            var dataType = new DataType() { Id = "default" };
            LayoutModel? componentModel = null;
            if (test.Layouts is not null)
            {
                var layout = new LayoutSetComponent(test.Layouts, "layout", dataType);
                componentModel = new LayoutModel([layout], null);
            }

            var state = new LayoutEvaluatorState(
                DynamicClassBuilder.DataAccessorFromJsonDocument(
                    test.Instance,
                    test.DataModel ?? JsonDocument.Parse("{}").RootElement
                ),
                componentModel,
                null!,
                test.FrontEndSettings ?? new()
            );

            await ExpressionEvaluator.EvaluateExpression(state, test.Expression, await test.GetContextOrNull(state));
        };
        (await act.Should().ThrowAsync<Exception>()).WithMessage(testCase.ExpectsFailure + "*");
    }

    private static async Task<InvalidTestCase> LoadData(string testName, string folder)
    {
        var data = await File.ReadAllTextAsync(Path.Join(folder, testName));
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

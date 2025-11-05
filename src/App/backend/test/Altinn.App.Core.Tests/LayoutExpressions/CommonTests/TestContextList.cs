using System.Text.Json;
using System.Text.Json.Serialization;
using Altinn.App.Core.Internal.Expressions;
using Altinn.App.Core.Models.Layout;
using Altinn.App.Core.Tests.LayoutExpressions.TestUtilities;
using Altinn.App.Core.Tests.TestUtils;
using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;
using Xunit.Abstractions;

namespace Altinn.App.Core.Tests.LayoutExpressions.CommonTests;

public class TestContextList
{
    private static readonly JsonSerializerOptions _jsonSerializerOptions = new()
    {
        WriteIndented = true,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingDefault,
    };

    private readonly ITestOutputHelper _output;

    public TestContextList(ITestOutputHelper output)
    {
        _output = output;
    }

    [Theory]
    [SharedTestContextList("simple")]
    public async Task Simple_Theory(string testName, string folder) => await RunTestCase(testName, folder);

    [Theory]
    [SharedTestContextList("groups")]
    public async Task Group_Theory(string testName, string folder) => await RunTestCase(testName, folder);

    [Theory]
    [SharedTestContextList("nonRepeatingGroups")]
    public async Task NonRepeatingGroup_Theory(string testName, string folder) => await RunTestCase(testName, folder);

    [Theory]
    [SharedTestContextList("recursiveGroups")]
    public async Task RecursiveGroup_Theory(string testName, string folder) => await RunTestCase(testName, folder);

    private static async Task<ContextListRoot> LoadTestData(string testName, string folder)
    {
        ContextListRoot testCase = new();
        var data = await File.ReadAllTextAsync(Path.Join(folder, testName));
        try
        {
            testCase = JsonSerializer.Deserialize<ContextListRoot>(data, _jsonSerializerOptions)!;
        }
        catch (Exception e)
        {
            testCase.ParsingException = e;
        }

        testCase.Filename = Path.GetFileName(testName);
        testCase.FullPath = testName;
        testCase.Folder = folder;
        testCase.RawJson = data;
        return testCase;
    }

    private async Task RunTestCase(string filename, string folder)
    {
        var test = await LoadTestData(filename, folder);
        _output.WriteLine($"{test.Filename} in {test.Folder}");
        _output.WriteLine(test.RawJson);
        _output.WriteLine(test.FullPath);

        var instance = new Instance() { Data = [] };
        var dataType = new DataType() { Id = "default" };
        var layout = new LayoutSetComponent(test.Layouts, "layout", dataType);

        var componentModel = new LayoutModel([layout], null);
        var state = new LayoutEvaluatorState(
            DynamicClassBuilder.DataAccessorFromJsonDocument(
                instance,
                test.DataModel ?? JsonDocument.Parse("{}").RootElement
            ),
            componentModel,
            null!,
            new()
        );

        test.ParsingException.Should().BeNull("Loading of test failed");

        var results = (await state.GetComponentContexts()).Select(ComponentContextForTestSpec.FromContext).ToList();
        _output.WriteLine(JsonSerializer.Serialize(new { resultContexts = results }, _jsonSerializerOptions));

        foreach (var (result, expected, index) in results.Zip(test.Expected, Enumerable.Range(0, int.MaxValue)))
        {
            result
                .Should()
                .BeEquivalentTo(
                    expected,
                    opt => opt.WithStrictOrdering(),
                    "component context at {0} should match",
                    index
                );
        }

        results.Count.Should().Be(test.Expected.Count);
    }

    [Fact]
    public void Ensure_tests_For_All_Folders()
    {
        // This is just a way to ensure that all folders have test methods associcated.
        var jsonTestFolders = Directory
            .GetDirectories(
                Path.Join(
                    PathUtils.GetCoreTestsPath(),
                    "LayoutExpressions",
                    "CommonTests",
                    "shared-tests",
                    "context-lists"
                )
            )
            .Select(d => Path.GetFileName(d))
            .ToArray();
        var testMethods = this.GetType()
            .GetMethods()
            .Select(m =>
                m.CustomAttributes.FirstOrDefault(ca => ca.AttributeType == typeof(SharedTestContextListAttribute))
                    ?.ConstructorArguments.FirstOrDefault()
                    .Value
            )
            .OfType<string>()
            .ToArray();
        testMethods
            .Should()
            .BeEquivalentTo(jsonTestFolders, "Shared test folders should have a corresponding test method");
    }
}

public class SharedTestContextListAttribute(string folder)
    : FileNamesInFolderDataAttribute(
        Path.Join("LayoutExpressions", "CommonTests", "shared-tests", "context-lists", folder)
    ) { }

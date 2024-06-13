using System.Reflection;
using System.Runtime.CompilerServices;
using System.Text.Json;
using System.Text.Json.Serialization;
using Altinn.App.Core.Internal.Expressions;
using Altinn.App.Core.Tests.Helpers;
using Altinn.App.Core.Tests.TestUtils;
using FluentAssertions;
using Xunit.Abstractions;
using Xunit.Sdk;

namespace Altinn.App.Core.Tests.LayoutExpressions;

public class TestContextList
{
    private static readonly JsonSerializerOptions _jsonSerializerOptions =
        new() { WriteIndented = true, DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingDefault };

    private readonly ITestOutputHelper _output;

    public TestContextList(ITestOutputHelper output)
    {
        _output = output;
    }

    [Theory]
    [SharedTestContextList("simple")]
    public void Simple_Theory(string testName, string folder) => RunTestCase(testName, folder);

    [Theory]
    [SharedTestContextList("groups")]
    public void Group_Theory(string testName, string folder) => RunTestCase(testName, folder);

    [Theory]
    [SharedTestContextList("nonRepeatingGroups")]
    public void NonRepeatingGroup_Theory(string testName, string folder) => RunTestCase(testName, folder);

    [Theory]
    [SharedTestContextList("recursiveGroups")]
    public void RecursiveGroup_Theory(string testName, string folder) => RunTestCase(testName, folder);

    private static ContextListRoot LoadTestData(string testName, string folder)
    {
        ContextListRoot testCase = new();
        var data = File.ReadAllText(Path.Join(folder, testName));
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

    private void RunTestCase(string filename, string folder)
    {
        var test = LoadTestData(filename, folder);
        _output.WriteLine($"{test.Filename} in {test.Folder}");
        _output.WriteLine(test.RawJson);
        _output.WriteLine(test.FullPath);
        var state = new LayoutEvaluatorState(new JsonDataModel(test.DataModel), test.ComponentModel, new(), new());

        test.ParsingException.Should().BeNull("Loading of test failed");

        var results = state.GetComponentContexts().Select(c => ComponentContextForTestSpec.FromContext(c)).ToList();
        _output.WriteLine(JsonSerializer.Serialize(new { resultContexts = results }, _jsonSerializerOptions));

        foreach (var (result, expected, index) in results.Zip(test.Expected, Enumerable.Range(0, int.MaxValue)))
        {
            result.Should().BeEquivalentTo(expected, "component context at {0} should match", index);
        }

        results.Count.Should().Be(test.Expected.Count);
    }

    [Fact]
    public void Ensure_tests_For_All_Folders()
    {
        // This is just a way to ensure that all folders have test methods associcated.
        var jsonTestFolders = Directory
            .GetDirectories(Path.Join("LayoutExpressions", "CommonTests", "shared-tests", "context-lists"))
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

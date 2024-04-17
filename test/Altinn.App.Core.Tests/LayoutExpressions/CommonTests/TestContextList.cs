using System.Reflection;
using System.Text.Json;
using System.Text.Json.Serialization;
using Altinn.App.Core.Internal.Expressions;
using Altinn.App.Core.Tests.Helpers;
using FluentAssertions;
using Xunit;
using Xunit.Abstractions;
using Xunit.Sdk;

namespace Altinn.App.Core.Tests.LayoutExpressions;

public class TestContextList
{
    private static readonly JsonSerializerOptions _jsonSerializerOptions = new()
    {
        WriteIndented = true,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingDefault
    };

    private readonly ITestOutputHelper _output;

    public TestContextList(ITestOutputHelper output)
    {
        _output = output;
    }

    [Theory]
    [SharedTestContextList("simple")]
    public void Simple_Theory(ContextListRoot test) => RunTestCase(test);

    [Theory]
    [SharedTestContextList("groups")]
    public void Group_Theory(ContextListRoot test) => RunTestCase(test);

    [Theory]
    [SharedTestContextList("nonRepeatingGroups")]
    public void NonRepeatingGroup_Theory(ContextListRoot test) => RunTestCase(test);

    [Theory]
    [SharedTestContextList("recursiveGroups")]
    public void RecursiveGroup_Theory(ContextListRoot test) => RunTestCase(test);

    private void RunTestCase(ContextListRoot test)
    {
        _output.WriteLine($"{test.Filename} in {test.Folder}");
        _output.WriteLine(test.RawJson);
        _output.WriteLine(test.FullPath);
        var state = new LayoutEvaluatorState(
            new JsonDataModel(test.DataModel),
            test.ComponentModel,
            new(),
            new());

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
        var jsonTestFolders = Directory.GetDirectories(Path.Join("LayoutExpressions", "CommonTests", "shared-tests", "context-lists")).Select(d => Path.GetFileName(d)).ToArray();
        var testMethods = this.GetType().GetMethods().Select(m => m.CustomAttributes.FirstOrDefault(ca => ca.AttributeType == typeof(SharedTestContextListAttribute))?.ConstructorArguments.FirstOrDefault().Value).OfType<string>().ToArray();
        testMethods.Should().BeEquivalentTo(jsonTestFolders, "Shared test folders should have a corresponding test method");
    }
}

public class SharedTestContextListAttribute : DataAttribute
{
    private static readonly JsonSerializerOptions _jsonSerializerOptions = new()
    {
        ReadCommentHandling = JsonCommentHandling.Skip,
    };

    private readonly string _folder;

    public SharedTestContextListAttribute(string folder)
    {
        _folder = folder;
    }

    public override IEnumerable<object[]> GetData(MethodInfo methodInfo)
    {
        var files = Directory.GetFiles(Path.Join("LayoutExpressions", "CommonTests", "shared-tests", "context-lists", _folder));
        foreach (var file in files)
        {
            ContextListRoot testCase = new();
            var data = File.ReadAllText(file);
            try
            {
                testCase = JsonSerializer.Deserialize<ContextListRoot>(data, _jsonSerializerOptions)!;
            }
            catch (Exception e)
            {
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

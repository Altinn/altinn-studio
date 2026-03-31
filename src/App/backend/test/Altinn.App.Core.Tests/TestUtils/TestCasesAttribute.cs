using System.Reflection;
using System.Text.Json;
using Altinn.App.Core.Tests.LayoutExpressions.CommonTests;
using Xunit.Sdk;

namespace Altinn.App.Core.Tests.TestUtils;

public class TestCasesAttribute(string folderName) : DataAttribute
{
    private static readonly JsonSerializerOptions _jsonSerializerOptions = new()
    {
        ReadCommentHandling = JsonCommentHandling.Skip,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    public override IEnumerable<object[]> GetData(MethodInfo testMethod)
    {
        var basePath = TestAttributeHelper.AltinnAppTestsBasePath();
        var folder = Path.Join(basePath, folderName);
        if (!Directory.Exists(folder))
        {
            throw new DirectoryNotFoundException($"Folder not found: {folder}");
        }
        var files = Directory.GetFiles(folder, "*.json");
        var theoryData = new List<ExpressionTestCaseRoot.TestCaseItem>();
        foreach (var file in files)
        {
            var data = File.ReadAllText(file);
            var rootCases = JsonSerializer.Deserialize<ExpressionTestCaseRoot>(data, _jsonSerializerOptions);
            if (rootCases?.TestCases is not null)
            {
                theoryData.AddRange(rootCases.TestCases);
            }
        }

        return theoryData.Select(x => new object[] { x.Name ?? string.Empty, x });
    }
}

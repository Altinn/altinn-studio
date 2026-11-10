using System.Text.Json;
using Altinn.App.Core.Internal.Expressions;
using Altinn.App.Core.Tests.LayoutExpressions.TestUtilities;

namespace Altinn.App.Core.Tests.LayoutExpressions.FullTests.NestedGroupsRequired;

public class NestedGroupsRequiredTests
{
    [Fact]
    public async Task RunLayoutValidationsForRequired_NestedGroups_SetsComponentIdAndRowIndexesOutermostFirst()
    {
        using var jsonDoc = JsonDocument.Parse(
            """
            {
                "some": {
                    "outer": [
                        { "name": "first", "inner": [{ "value": "a" }, { "value": "b" }] },
                        { "name": null, "inner": [{ "value": "c" }, { "value": null }, { "value": "e" }] }
                    ]
                }
            }
            """
        );
        var data = DynamicClassBuilder.DataObjectFromJsonDocument(jsonDoc.RootElement);
        var state = await LayoutTestUtils.GetLayoutModelTools(data, "NestedGroupsRequired");

        var issues = await LayoutEvaluator.RunLayoutValidationsForRequired(state);

        var actual = issues
            .Select(i => (i.Field, i.ComponentId, string.Join(",", i.RowIndexes ?? [])))
            .Order()
            .ToList();
        Assert.Equal(
            [("some.outer[1].inner[1].value", "inner-input", "1,1"), ("some.outer[1].name", "outer-input", "1")],
            actual
        );
    }
}

using Altinn.App.Core.Models.Validation;

namespace Altinn.App.Core.Tests.Models.Validation;

public class ValidationIssueWithSourceTests
{
    [Fact]
    public void FromIssue_CopiesComponentIdAndRowIndexes()
    {
        var issue = new ValidationIssue
        {
            Severity = ValidationIssueSeverity.Error,
            Field = "group[1].child[0].name",
            ComponentId = "name-input",
            RowIndexes = [1, 0],
        };

        var result = ValidationIssueWithSource.FromIssue(issue, "source", noIncrementalUpdates: false);

        Assert.Equal("name-input", result.ComponentId);
        Assert.Equal(new[] { 1, 0 }, result.RowIndexes);
    }

    [Fact]
    public void FromIssue_WithoutComponent_LeavesComponentIdAndRowIndexesNull()
    {
        var issue = new ValidationIssue { Severity = ValidationIssueSeverity.Error, Field = "name" };

        var result = ValidationIssueWithSource.FromIssue(issue, "source", noIncrementalUpdates: false);

        Assert.Null(result.ComponentId);
        Assert.Null(result.RowIndexes);
    }
}

using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using Altinn.Studio.Designer.ViewModels.Request;
using Xunit;

namespace Designer.Tests.ViewModels.Request;

public class CreateReleaseRequestViewModelTests
{
    [Theory]
    [InlineData(null)]
    [InlineData("master")]
    [InlineData("v9-upgrade")]
    public void Validate_AcceptsMissingOrValidBranch(string branch)
    {
        CreateReleaseRequestViewModel request = CreateRequest(branch);

        List<ValidationResult> issues = request.Validate(new ValidationContext(request)).ToList();

        Assert.Empty(issues);
    }

    [Theory]
    [InlineData("")]
    [InlineData("../master")]
    [InlineData("feature branch")]
    public void Validate_RejectsInvalidBranch(string branch)
    {
        CreateReleaseRequestViewModel request = CreateRequest(branch);

        List<ValidationResult> issues = request.Validate(new ValidationContext(request)).ToList();

        ValidationResult issue = Assert.Single(issues);
        Assert.Contains(nameof(CreateReleaseRequestViewModel.Branch), issue.MemberNames);
    }

    private static CreateReleaseRequestViewModel CreateRequest(string branch) =>
        new()
        {
            TagName = "1",
            Name = "1",
            TargetCommitish = "eec136ac2d31cf984d2053df79f181b99c3b4db5",
            Branch = branch,
        };
}

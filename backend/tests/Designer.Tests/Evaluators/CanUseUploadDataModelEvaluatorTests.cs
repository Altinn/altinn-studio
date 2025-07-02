using System.Threading.Tasks;
using Altinn.Studio.Designer.Enums;
using Altinn.Studio.Designer.Evaluators;
using Altinn.Studio.Designer.Services.Interfaces;
using Moq;
using Xunit;

namespace Designer.Tests.Evaluators;

public class CanUseUploadDataModelEvaluatorTests
{
    [Fact]
    public void Feature_ReturnsCorrectEnum()
    {
        var userOrgServiceMock = new Mock<IUserOrganizationService>();
        var evaluator = new CanUseUploadDataModelEvaluator(userOrgServiceMock.Object);

        var feature = evaluator.Feature;

        Assert.Equal(CanUseFeatureEnum.UploadDataModel, feature);
    }

    [Fact]
    public async Task CanUseFeatureAsync_ReturnsTrue_WhenUserIsMemberOfOrganization()
    {
        var userOrgServiceMock = new Mock<IUserOrganizationService>();
        userOrgServiceMock
            .Setup(s => s.UserIsMemberOfAnyOrganization())
            .ReturnsAsync(true);

        var evaluator = new CanUseUploadDataModelEvaluator(userOrgServiceMock.Object);
        bool result = await evaluator.CanUseFeatureAsync();

        Assert.True(result);
    }

    [Fact]
    public async Task CanUseFeatureAsync_ReturnsFalse_WhenUserIsNotMemberOfOrganization()
    {
        var userOrgServiceMock = new Mock<IUserOrganizationService>();
        userOrgServiceMock
            .Setup(s => s.UserIsMemberOfAnyOrganization())
            .ReturnsAsync(false);

        var evaluator = new CanUseUploadDataModelEvaluator(userOrgServiceMock.Object);
        bool result = await evaluator.CanUseFeatureAsync();

        Assert.False(result);
    }
}

using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Enums;
using Altinn.Studio.Designer.Services.Implementation;
using Altinn.Studio.Designer.Services.Interfaces;
using Moq;
using Xunit;

namespace Designer.Tests.Services;

public class OrgContentServiceTests
{
    private readonly Mock<IGiteaContentLibraryService> _mockGiteaContentLibraryService;
    private readonly OrgContentService _orgContentService;
    private const string OrgName = "ttd";

    public OrgContentServiceTests()
    {
        _mockGiteaContentLibraryService = new Mock<IGiteaContentLibraryService>();
        _orgContentService = new OrgContentService(_mockGiteaContentLibraryService.Object);
    }

    [Fact]
    public async Task GetOrgContentReferences_WithoutTypeParameter_ReturnsAllReferences()
    {
        // Arrange
        var codeListIds = new List<string> { "codelist1", "codelist2" };
        var textIds = new List<string> { "text1", "text2" };

        _mockGiteaContentLibraryService.Setup(service => service.GetCodeListIds(OrgName)).ReturnsAsync(codeListIds);
        _mockGiteaContentLibraryService.Setup(service => service.GetTextIds(OrgName)).ReturnsAsync(textIds);

        // Act
        var result = await _orgContentService.GetOrgContentReferences(null, OrgName);

        // Assert
        Assert.Equal(4, result.Count);
        Assert.Contains(result, item => item.Id == "codelist1" && item.Type == LibraryContentType.CodeList);
        Assert.Contains(result, item => item.Id == "codelist2" && item.Type == LibraryContentType.CodeList);
        Assert.Contains(result, item => item.Id == "text1" && item.Type == LibraryContentType.TextResource);
        Assert.Contains(result, item => item.Id == "text2" && item.Type == LibraryContentType.TextResource);
        Assert.All(result, item => Assert.Equal($"org.{OrgName}", item.Source));
    }

    [Fact]
    public async Task GetOrgContentReferences_WithCodeListType_ReturnsCodeListReferences()
    {
        // Arrange
        var codeListIds = new List<string> { "codelist1", "codelist2" };
        _mockGiteaContentLibraryService.Setup(service => service.GetCodeListIds(OrgName)).ReturnsAsync(codeListIds);

        // Act
        var contentList = await _orgContentService.GetOrgContentReferences(LibraryContentType.CodeList, OrgName);

        // Assert
        Assert.Equal(2, contentList.Count);
        Assert.All(contentList, contentItem => Assert.Equal(LibraryContentType.CodeList, contentItem.Type));
        Assert.All(contentList, contentItem => Assert.Equal($"org.{OrgName}", contentItem.Source));
        Assert.Contains(contentList, contentItem => contentItem.Id == "codelist1");
        Assert.Contains(contentList, contentItem => contentItem.Id == "codelist2");

        _mockGiteaContentLibraryService.Verify(service => service.GetCodeListIds(OrgName), Times.Once);
    }

    [Fact]
    public async Task GetOrgContentReferences_WithTextResourceType_ReturnsTextResourceReferences()
    {
        // Arrange
        var textIds = new List<string> { "text1", "text2", "text3" };
        _mockGiteaContentLibraryService.Setup(service => service.GetTextIds(OrgName)).ReturnsAsync(textIds);

        // Act
        var contentList = await _orgContentService.GetOrgContentReferences(LibraryContentType.TextResource, OrgName);

        // Assert
        Assert.Equal(3, contentList.Count);
        Assert.All(contentList, contentItem => Assert.Equal(LibraryContentType.TextResource, contentItem.Type));
        Assert.All(contentList, contentItem => Assert.Equal($"org.{OrgName}", contentItem.Source));
        Assert.Contains(contentList, contentItem => contentItem.Id == "text1");
        Assert.Contains(contentList, contentItem => contentItem.Id == "text2");
        Assert.Contains(contentList, contentItem => contentItem.Id == "text3");

        _mockGiteaContentLibraryService.Verify(service => service.GetTextIds(OrgName), Times.Once);
    }

    [Fact]
    public async Task GetOrgContentReferences_WithUnsupportedType_ReturnsEmptyList()
    {
        // Act
        var result = await _orgContentService.GetOrgContentReferences((LibraryContentType)999, OrgName);

        // Assert
        Assert.Empty(result);
        _mockGiteaContentLibraryService.Verify(service => service.GetCodeListIds(It.IsAny<string>()), Times.Never);
        _mockGiteaContentLibraryService.Verify(service => service.GetTextIds(It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task GetCodeListReferences_WithNoIdsFound_ReturnsEmptyList()
    {
        // Arrange
        _mockGiteaContentLibraryService.Setup(service => service.GetCodeListIds(OrgName)).ReturnsAsync([]);

        // Act
        var result = await _orgContentService.GetOrgContentReferences(LibraryContentType.CodeList, OrgName);

        // Assert
        Assert.Empty(result);
    }

    [Fact]
    public async Task GetTextResourceReferences_WithNoIdsFound_ReturnsEmptyList()
    {
        // Arrange
        _mockGiteaContentLibraryService.Setup(service => service.GetTextIds(OrgName)).ReturnsAsync([]);

        // Act
        var result = await _orgContentService.GetOrgContentReferences(LibraryContentType.TextResource, OrgName);

        // Assert
        Assert.Empty(result);
    }
}

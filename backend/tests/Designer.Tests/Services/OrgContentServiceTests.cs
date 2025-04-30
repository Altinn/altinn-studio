using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Enums;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Implementation;
using Altinn.Studio.Designer.Services.Interfaces.Organisation;
using Moq;
using Xunit;

namespace Designer.Tests.Services;

public class OrgContentServiceTests
{
    private readonly Mock<IOrgCodeListService> _mockOrgCodeListService;
    private readonly Mock<IOrgTextsService> _mockOrgTextsService;
    private readonly OrgContentService _orgContentService;
    private readonly AltinnOrgContext _context;
    private const string OrgName = "ttd";
    private const string DeveloperName = "testUser";

    public OrgContentServiceTests()
    {
        _mockOrgCodeListService = new Mock<IOrgCodeListService>();
        _mockOrgTextsService = new Mock<IOrgTextsService>();
        _orgContentService = new OrgContentService(_mockOrgCodeListService.Object, _mockOrgTextsService.Object);
        _context = AltinnOrgContext.FromOrg(OrgName, DeveloperName);
    }

    [Fact]
    public async Task GetOrgContentReferences_WithoutTypeParameter_ReturnsAllReferences()
    {
        // Arrange
        var codeListIds = new List<string> { "codelist1", "codelist2" };
        var textIds = new List<string> { "text1", "text2" };

        _mockOrgCodeListService
            .Setup(s => s.GetCodeListIds(OrgName, DeveloperName, CancellationToken.None))
            .Returns(codeListIds);
        _mockOrgTextsService
            .Setup(s => s.GetTextIds(OrgName, DeveloperName, It.IsAny<CancellationToken>()))
            .ReturnsAsync(textIds);

        // Act
        var result = await _orgContentService.GetOrgContentReferences(null, _context);

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
        _mockOrgCodeListService
            .Setup(s => s.GetCodeListIds(OrgName, DeveloperName, CancellationToken.None))
            .Returns(codeListIds);

        // Act
        var contentList = await _orgContentService.GetOrgContentReferences(LibraryContentType.CodeList, _context);

        // Assert
        Assert.Equal(2, contentList.Count);
        Assert.All(contentList, contentItem => Assert.Equal(LibraryContentType.CodeList, contentItem.Type));
        Assert.All(contentList, contentItem => Assert.Equal($"org.{OrgName}", contentItem.Source));
        Assert.Contains(contentList, contentItem => contentItem.Id == "codelist1");
        Assert.Contains(contentList, contentItem => contentItem.Id == "codelist2");

        _mockOrgCodeListService.Verify(s =>
            s.GetCodeListIds(OrgName, DeveloperName, CancellationToken.None), Times.Once);
    }

    [Fact]
    public async Task GetOrgContentReferences_WithTextResourceType_ReturnsTextResourceReferences()
    {
        // Arrange
        var textIds = new List<string> { "text1", "text2", "text3" };
        _mockOrgTextsService
            .Setup(s => s.GetTextIds(OrgName, DeveloperName, It.IsAny<CancellationToken>()))
            .ReturnsAsync(textIds);

        // Act
        var contentList = await _orgContentService.GetOrgContentReferences(LibraryContentType.TextResource, _context);

        // Assert
        Assert.Equal(3, contentList.Count);
        Assert.All(contentList, contentItem => Assert.Equal(LibraryContentType.TextResource, contentItem.Type));
        Assert.All(contentList, contentItem => Assert.Equal($"org.{OrgName}", contentItem.Source));
        Assert.Contains(contentList, contentItem => contentItem.Id == "text1");
        Assert.Contains(contentList, contentItem => contentItem.Id == "text2");
        Assert.Contains(contentList, contentItem => contentItem.Id == "text3");

        _mockOrgTextsService.Verify(s =>
            s.GetTextIds(OrgName, DeveloperName, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task GetOrgContentReferences_WithUnsupportedType_ReturnsEmptyList()
    {
        // Act
        var result = await _orgContentService.GetOrgContentReferences((LibraryContentType)999, _context);

        // Assert
        Assert.Empty(result);
        _mockOrgCodeListService.Verify(s =>
            s.GetCodeListIds(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
        _mockOrgTextsService.Verify(s =>
            s.GetTextIds(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task GetOrgContentReferences_WithCancellationToken_PassesTokenToServices()
    {
        // Arrange
        var cts = new CancellationTokenSource();
        var token = cts.Token;
        var textIds = new List<string> { "text1" };

        _mockOrgTextsService
            .Setup(s => s.GetTextIds(OrgName, DeveloperName, token))
            .ReturnsAsync(textIds);

        // Act
        await _orgContentService.GetOrgContentReferences(LibraryContentType.TextResource, _context, token);

        // Assert
        _mockOrgTextsService.Verify(s => s.GetTextIds(OrgName, DeveloperName, token), Times.Once);
    }

    [Fact]
    public async Task GetCodeListReferences_WithNoIdsFound_ReturnsEmptyList()
    {
        // Arrange
        _mockOrgCodeListService
            .Setup(s => s.GetCodeListIds(OrgName, DeveloperName, CancellationToken.None))
            .Returns([]);

        // Act
        var result = await _orgContentService.GetOrgContentReferences(LibraryContentType.CodeList, _context);

        // Assert
        Assert.Empty(result);
    }

    [Fact]
    public async Task GetTextResourceReferences_WithNoIdsFound_ReturnsEmptyList()
    {
        // Arrange
        _mockOrgTextsService
            .Setup(s => s.GetTextIds(OrgName, DeveloperName, It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);

        // Act
        var result = await _orgContentService.GetOrgContentReferences(LibraryContentType.TextResource, _context);

        // Assert
        Assert.Empty(result);
    }
}

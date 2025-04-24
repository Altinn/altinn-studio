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
    public async Task GetContentList_WithCodeListType_ReturnsCodeListResources()
    {
        // Arrange
        var codeListIds = new List<string> { "codelist1", "codelist2" };
        _mockOrgCodeListService
            .Setup(s => s.GetCodeListIds(OrgName, DeveloperName, CancellationToken.None))
            .Returns(codeListIds);

        // Act
        var result = await _orgContentService.GetContentList(LibraryContentType.CodeList, _context);

        // Assert
        Assert.Equal(2, result.Count);
        Assert.All(result, r => Assert.Equal(LibraryContentType.CodeList, r.Type));
        Assert.All(result, r => Assert.Equal($"org.{OrgName}", r.Source));
        Assert.Contains(result, r => r.Id == "codelist1");
        Assert.Contains(result, r => r.Id == "codelist2");

        _mockOrgCodeListService.Verify(s =>
            s.GetCodeListIds(OrgName, DeveloperName, CancellationToken.None), Times.Once);
    }

    [Fact]
    public async Task GetContentList_WithTextResourceType_ReturnsTextResources()
    {
        // Arrange
        var textIds = new List<string> { "text1", "text2", "text3" };
        _mockOrgTextsService
            .Setup(s => s.GetTextIds(OrgName, DeveloperName, It.IsAny<CancellationToken>()))
            .ReturnsAsync(textIds);

        // Act
        var result = await _orgContentService.GetContentList(LibraryContentType.TextResource, _context);

        // Assert
        Assert.Equal(3, result.Count);
        Assert.All(result, r => Assert.Equal(LibraryContentType.TextResource, r.Type));
        Assert.All(result, r => Assert.Equal($"org.{OrgName}", r.Source));
        Assert.Contains(result, r => r.Id == "text1");
        Assert.Contains(result, r => r.Id == "text2");
        Assert.Contains(result, r => r.Id == "text3");

        _mockOrgTextsService.Verify(s =>
            s.GetTextIds(OrgName, DeveloperName, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task GetContentList_WithUnsupportedType_ReturnsEmptyList()
    {
        // Act
        var result = await _orgContentService.GetContentList((LibraryContentType)999, _context);

        // Assert
        Assert.Empty(result);
        _mockOrgCodeListService.Verify(s =>
            s.GetCodeListIds(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
        _mockOrgTextsService.Verify(s =>
            s.GetTextIds(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task GetContentList_WithCancellationToken_PassesTokenToServices()
    {
        // Arrange
        var cts = new CancellationTokenSource();
        var token = cts.Token;
        var textIds = new List<string> { "text1" };

        _mockOrgTextsService
            .Setup(s => s.GetTextIds(OrgName, DeveloperName, token))
            .ReturnsAsync(textIds);

        // Act
        await _orgContentService.GetContentList(LibraryContentType.TextResource, _context, token);

        // Assert
        _mockOrgTextsService.Verify(s => s.GetTextIds(OrgName, DeveloperName, token), Times.Once);
    }

    [Fact]
    public async Task GetCodeListContentList_WithEmptyList_ReturnsEmptyResourceList()
    {
        // Arrange
        _mockOrgCodeListService
            .Setup(s => s.GetCodeListIds(OrgName, DeveloperName, CancellationToken.None))
            .Returns([]);

        // Act
        var result = await _orgContentService.GetContentList(LibraryContentType.CodeList, _context);

        // Assert
        Assert.Empty(result);
    }

    [Fact]
    public async Task GetTextContentList_WithEmptyList_ReturnsEmptyResourceList()
    {
        // Arrange
        _mockOrgTextsService
            .Setup(s => s.GetTextIds(OrgName, DeveloperName, It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);

        // Act
        var result = await _orgContentService.GetContentList(LibraryContentType.TextResource, _context);

        // Assert
        Assert.Empty(result);
    }
}

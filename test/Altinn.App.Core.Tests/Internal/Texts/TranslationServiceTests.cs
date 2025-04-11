using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Texts;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Moq;

namespace Altinn.App.Core.Tests.Internal;

public class TranslationServiceTests
{
    private readonly Mock<IAppResources> _appResourcesMock = new(MockBehavior.Loose);
    private readonly TranslationService _translationService;

    public TranslationServiceTests()
    {
        _appResourcesMock
            .Setup(appResources =>
                appResources.GetTexts(It.IsAny<string>(), It.IsAny<string>(), It.Is<string>(s => s == "nb"))
            )
            .ReturnsAsync(
                new TextResource
                {
                    Resources = new List<TextResourceElement>()
                    {
                        new TextResourceElement { Id = "text", Value = "bokmål" },
                    },
                }
            );

        _appResourcesMock
            .Setup(appResources =>
                appResources.GetTexts(It.IsAny<string>(), It.IsAny<string>(), It.Is<string>(s => s == "en"))
            )
            .ReturnsAsync(
                new TextResource
                {
                    Resources = new List<TextResourceElement>()
                    {
                        new TextResourceElement { Id = "text", Value = "english" },
                    },
                }
            );

        _translationService = new TranslationService(new AppIdentifier("org", "app"), _appResourcesMock.Object);
    }

    [Fact]
    public async Task Returns_Nb()
    {
        var result = await _translationService.TranslateTextKey("text", "nb");
        Assert.Equal("bokmål", result);
    }

    [Fact]
    public async Task Returns_En()
    {
        var result = await _translationService.TranslateTextKey("text", "en");
        Assert.Equal("english", result);
    }

    [Fact]
    public async Task Default_Nb()
    {
        var result = await _translationService.TranslateTextKey("text", null);
        Assert.Equal("bokmål", result);
    }

    [Fact]
    public async Task Fallback_Nb()
    {
        var result = await _translationService.TranslateTextKey("text", "nn");
        Assert.Equal("bokmål", result);
    }

    [Fact]
    public async Task Fail_Missing()
    {
        await Assert.ThrowsAsync<ArgumentException>(
            async () => await _translationService.TranslateTextKey("missing", "nb")
        );
    }
}

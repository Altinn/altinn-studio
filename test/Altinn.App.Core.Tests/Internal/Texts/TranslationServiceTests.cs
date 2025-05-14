using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Language;
using Altinn.App.Core.Internal.Texts;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Moq;

namespace Altinn.App.Core.Tests.Internal.Texts;

public class TranslationServiceTests
{
    private readonly Mock<IAppResources> _appResourcesMock = new(MockBehavior.Loose);
    private readonly TranslationService _translationService;

    public TranslationServiceTests()
    {
        _appResourcesMock
            .Setup(appResources =>
                appResources.GetTexts(It.IsAny<string>(), It.IsAny<string>(), It.Is<string>(s => s == LanguageConst.Nb))
            )
            .ReturnsAsync(
                new TextResource
                {
                    Resources =
                    [
                        new TextResourceElement { Id = "text", Value = "bokmål" },
                        new TextResourceElement { Id = "text2", Value = "bokmål2" },
                    ],
                }
            );

        _appResourcesMock
            .Setup(appResources =>
                appResources.GetTexts(It.IsAny<string>(), It.IsAny<string>(), It.Is<string>(s => s == LanguageConst.En))
            )
            .ReturnsAsync(
                new TextResource { Resources = [new TextResourceElement { Id = "text", Value = "english" }] }
            );

        _translationService = new TranslationService(new AppIdentifier("org", "app"), _appResourcesMock.Object);
    }

    [Fact]
    public async Task TranslateTextKey_Returns_Nb()
    {
        var result = await _translationService.TranslateTextKey("text", LanguageConst.Nb);
        Assert.Equal("bokmål", result);
    }

    [Fact]
    public async Task TranslateTextKey_Returns_En()
    {
        var result = await _translationService.TranslateTextKey("text", LanguageConst.En);
        Assert.Equal("english", result);
    }

    [Fact]
    public async Task TranslateTextKey_Default_Nb()
    {
        var result = await _translationService.TranslateTextKey("text", null);
        Assert.Equal("bokmål", result);
    }

    [Fact]
    public async Task TranslateTextKey_Fallback_Nb()
    {
        var result = await _translationService.TranslateTextKey("text", LanguageConst.Nn);
        Assert.Equal("bokmål", result);
    }

    [Fact]
    public async Task TranslateTextKey_Fail_Missing()
    {
        var result = await _translationService.TranslateTextKey("missing", "nb");
        Assert.Null(result);
    }

    [Fact]
    public async Task TranslateTextKeyLenient_Returns_Null_If_Key_Is_Null()
    {
        var result = await _translationService.TranslateTextKeyLenient(null, LanguageConst.Nb);
        Assert.Null(result);
    }

    [Fact]
    public async Task TranslateFirstMatchingTextKey_Returns_First_Match()
    {
        var result = await _translationService.TranslateFirstMatchingTextKey(
            LanguageConst.Nb,
            "missing",
            "text2",
            "text"
        );
        Assert.Equal("bokmål2", result);
    }

    [Fact]
    public async Task TranslateFirstMatchingTextKey_Returns_Null_If_No_Match()
    {
        var result = await _translationService.TranslateFirstMatchingTextKey(
            LanguageConst.Nb,
            "missing",
            "missing2",
            "missing3"
        );
        Assert.Null(result);
    }

    [Fact]
    public async Task TranslateFirstMatchingTextKey_Default_Nb()
    {
        var result = await _translationService.TranslateFirstMatchingTextKey(null, "text");
        Assert.Equal("bokmål", result);
    }

    [Fact]
    public async Task TranslateFirstMatchingTextKey_Fallback_Nb()
    {
        var result = await _translationService.TranslateFirstMatchingTextKey(LanguageConst.Nn, "text");
        Assert.Equal("bokmål", result);
    }
}

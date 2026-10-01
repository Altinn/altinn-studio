using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Expressions;
using Altinn.App.Core.Internal.Language;
using Altinn.App.Core.Internal.Pdf;
using Altinn.App.Core.Internal.Texts;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Layout;
using Altinn.App.Core.Models.Layout.Components;
using Altinn.Platform.Storage.Interface.Models;
using Moq;
using Xunit.Abstractions;

namespace Altinn.App.Core.Tests.Internal.Pdf;

public class PdfFileNameResolverTests(ITestOutputHelper outputHelper)
{
    [Fact]
    public async Task GetFileName_DefaultFileName_WithoutTexts_ShouldUseAppId()
    {
        var appResources = CreateAppResources([]);
        var target = CreateResolver(appResources);

        string fileName = await target.GetFileName(CreateDataAccessorMock(appResources).Object);

        Assert.Equal("not-really-an-app.pdf", fileName);
    }

    [Fact]
    public async Task GetFileName_DefaultFileName_KeepsSpaces()
    {
        var appResources = CreateAppResources([new() { Id = "appName", Value = "Not Really An App" }]);
        var target = CreateResolver(appResources);

        string fileName = await target.GetFileName(CreateDataAccessorMock(appResources).Object);

        Assert.Equal("Not Really An App.pdf", fileName);
    }

    [Fact]
    public async Task GetFileName_WithCustomFileNameTextResourceKey_ShouldUseCustomFileName()
    {
        const string customTextResourceKey = "custom.pdf.filename";
        var appResources = CreateAppResources([new() { Id = customTextResourceKey, Value = "My Custom Receipt" }]);
        var target = CreateResolver(appResources);

        string fileName = await target.GetFileName(CreateDataAccessorMock(appResources).Object, customTextResourceKey);

        Assert.Equal("My Custom Receipt.pdf", fileName);
    }

    [Fact]
    public async Task GetFileName_WithCustomFileNameIncludingPdfExtension_ShouldNotDuplicateExtension()
    {
        const string customTextResourceKey = "custom.pdf.filename.with.extension";
        var appResources = CreateAppResources([new() { Id = customTextResourceKey, Value = "My Custom Receipt.pdf" }]);
        var target = CreateResolver(appResources);

        string fileName = await target.GetFileName(CreateDataAccessorMock(appResources).Object, customTextResourceKey);

        Assert.Equal("My Custom Receipt.pdf", fileName);
    }

    private static Mock<IAppResources> CreateAppResources(List<TextResourceElement> texts)
    {
        var appResources = new Mock<IAppResources>();
        appResources
            .Setup(s => s.GetTexts(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(
                new TextResource
                {
                    Id = "digdir-not-really-an-app-nb",
                    Language = LanguageConst.Nb,
                    Org = "digdir",
                    Resources = texts,
                }
            );
        return appResources;
    }

    private PdfFileNameResolver CreateResolver(Mock<IAppResources> appResources)
    {
        return new PdfFileNameResolver(
            new TranslationService(
                new AppIdentifier("digdir", "not-really-an-app"),
                appResources.Object,
                FakeLoggerXunit.Get<TranslationService>(outputHelper)
            )
        );
    }

    private static Mock<IInstanceDataAccessor> CreateDataAccessorMock(Mock<IAppResources> appResources)
    {
        Instance instance = new()
        {
            Id = $"509378/{Guid.NewGuid()}",
            AppId = "digdir/not-really-an-app",
            Org = "digdir",
            Process = new() { CurrentTask = new() { ElementId = "Task_1" } },
            Data = [new() { Id = Guid.NewGuid().ToString(), DataType = "Model" }],
        };
        var dataAccessorMock = new Mock<IInstanceDataAccessor>();
        dataAccessorMock.Setup(m => m.Instance).Returns(instance);

        // The layout evaluator state fills in the variables of a custom file name
        var uiFolderComponent = new UiFolderComponent(
            new List<PageComponent>(),
            "layout",
            new DataType { Id = "Model" }
        );
        var layoutModel = new LayoutModel([uiFolderComponent], null);
        appResources.Setup(x => x.GetLayoutModelForFolder(It.IsAny<string>())).Returns(layoutModel);
        var layoutEvaluatorState = new LayoutEvaluatorState(
            dataAccessorMock.Object,
            layoutModel,
            Mock.Of<ITranslationService>(),
            new FrontEndSettings(),
            gatewayAction: null,
            language: null
        );
        dataAccessorMock.Setup(m => m.GetLayoutEvaluatorState()).Returns(layoutEvaluatorState);

        return dataAccessorMock;
    }
}

using System.Collections.Immutable;
using Altinn.App.Core.Internal.Texts;
using Altinn.App.Core.Models.Expressions;
using Altinn.App.Core.Models.Layout;
using Altinn.App.Core.Models.Layout.Components;
using Altinn.App.Tests.Common.Fixtures;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit.Abstractions;

namespace Altinn.App.Core.Tests.Internal.Texts;

public class TranslationServiceInstanceTests
{
    private readonly ITestOutputHelper _output;

    public TranslationServiceInstanceTests(ITestOutputHelper output)
    {
        _output = output;
    }

    public class SkjemaModel
    {
        public string? Input1 { get; set; }
    }

    [Fact]
    public async Task TranslateTextKey_WithDataSources()
    {
        var fixture = new MockedServiceCollection();
        fixture.OutputHelper = _output;
        var language = "esperanto";
        fixture.AddTextResource(
            language,
            new TextResourceElement()
            {
                Id = "resourceKey",
                Value = "AppName: {0}, Value: {1}",
                Variables =
                [
                    new TextResourceVariable() { DataSource = "text", Key = "appName" },
                    new TextResourceVariable() { DataSource = "dataModel.default", Key = "Input1" },
                ],
            }
        );
        fixture.TryAddCommonServices();

        await using var provider = fixture.BuildServiceProvider();
        var dataAccessor = await provider.CreateInstanceDataMutatorWithDataAndLayout(
            new SkjemaModel() { Input1 = "123Test" },
            [
                new UnknownComponent
                {
                    Id = "input1",
                    PageId = "page1",
                    LayoutId = "layoutSet1",
                    Type = "Input",
                    Hidden = default,
                    RemoveWhenHidden = default,
                    Required = default,
                    ReadOnly = default,
                    DataModelBindings = new Dictionary<string, ModelBinding>()
                    {
                        {
                            "simpleBinding",
                            new ModelBinding { Field = nameof(SkjemaModel.Input1) }
                        },
                    },
                    TextResourceBindings = ImmutableDictionary<string, Expression>.Empty,
                },
            ],
            language
        );
        var translationService = provider.GetRequiredService<ITranslationService>();

        var translation = await translationService.TranslateTextKey("resourceKey", dataAccessor);

        Assert.Equal("AppName: Testapplikasjon, Value: 123Test", translation);
    }

    [Fact]
    public async Task TranslateTextKey_WithDataModelDefault_WithoutLayoutSet_ThrowsException()
    {
        var fixture = new MockedServiceCollection();
        fixture.OutputHelper = _output;
        var language = "nb";

        // Set up a text resource that uses dataModel.default
        fixture.AddTextResource(
            language,
            new TextResourceElement()
            {
                Id = "testResource",
                Value = "Value: {0}",
                Variables = [new TextResourceVariable() { DataSource = "dataModel.default", Key = "Input1" }],
            }
        );

        // Add a data type but NO layout set
        var dataType = fixture.AddDataType<SkjemaModel>();

        fixture.TryAddCommonServices();

        // Override the mock to return null instead of throwing for GetLayoutModelForTask
        fixture.AppResourcesMock.Setup(a => a.GetLayoutModelForTask(It.IsAny<string>())).Returns(default(LayoutModel));

        await using var provider = fixture.BuildServiceProvider();

        var dataAccessor = await provider.CreateInstanceDataUnitOfWork(
            new SkjemaModel() { Input1 = "test value" },
            dataType,
            language
        );

        var translationService = provider.GetRequiredService<ITranslationService>();

        // Should throw because dataModel.default requires a layout-set to resolve the default data type
        var exception = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            translationService.TranslateTextKey("testResource", dataAccessor)
        );
        Assert.Contains("dataModel.default", exception.Message);
        Assert.Contains("no layout-set is available", exception.Message);
    }

    [Fact]
    public async Task TranslateTextKey_WithExplicitDataType_WithoutLayoutSet_ReturnsValue()
    {
        var fixture = new MockedServiceCollection();
        fixture.OutputHelper = _output;
        var language = "nb";

        var dataType = fixture.AddDataType<SkjemaModel>(dataTypeId: "SkjemaModel");

        // Set up a text resource that uses an explicit data type (not "default")
        fixture.AddTextResource(
            language,
            new TextResourceElement()
            {
                Id = "testResource",
                Value = "Value: {0}",
                Variables = [new TextResourceVariable() { DataSource = "dataModel.SkjemaModel", Key = "Input1" }],
            }
        );

        fixture.TryAddCommonServices();

        // Override the mock to return null instead of throwing for GetLayoutModelForTask
        fixture.AppResourcesMock.Setup(a => a.GetLayoutModelForTask(It.IsAny<string>())).Returns(default(LayoutModel));

        await using var provider = fixture.BuildServiceProvider();

        var dataAccessor = await provider.CreateInstanceDataUnitOfWork(
            new SkjemaModel() { Input1 = "explicit type value" },
            dataType,
            language
        );

        var translationService = provider.GetRequiredService<ITranslationService>();

        // Should succeed because we're using an explicit data type name, not "default"
        var translation = await translationService.TranslateTextKey("testResource", dataAccessor);

        Assert.Equal("Value: explicit type value", translation);
    }
}

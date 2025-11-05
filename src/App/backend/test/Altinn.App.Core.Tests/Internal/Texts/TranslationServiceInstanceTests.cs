using System.Collections.Immutable;
using Altinn.App.Core.Internal.Texts;
using Altinn.App.Core.Models.Expressions;
using Altinn.App.Core.Models.Layout;
using Altinn.App.Core.Models.Layout.Components;
using Altinn.App.Tests.Common.Fixtures;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.DependencyInjection;
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
        fixture.AddXunitLogging(_output);
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
}

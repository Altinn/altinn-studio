#nullable enable
using System.Text.Json;

using Altinn.App.Core.Configuration;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Expressions;
using Altinn.App.Core.Models.Layout;
using Altinn.App.Core.Models.Layout.Components;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.DependencyInjection;
using Moq;

namespace Altinn.App.Core.Tests.LayoutExpressions;

public static class LayoutTestUtils
{
    public static async Task<LayoutEvaluatorState> GetLayoutModelTools(object model, string folder)
    {
        var services = new ServiceCollection();

        var data = new Mock<IDataClient>();
        data.Setup(d => d.GetFormData(default, default!, default!, default!, default, default)).ReturnsAsync(model);
        services.AddTransient<IDataClient>((sp) => data.Object);

        var resources = new Mock<IAppResources>();
        var layoutModel = new LayoutModel();
        var layoutsPath = Path.Join("LayoutExpressions", "FullTests", folder);
        foreach (var layoutFile in Directory.GetFiles(layoutsPath, "*.json"))
        {
            var layout = await File.ReadAllBytesAsync(layoutFile);
            string pageName = layoutFile.Replace(layoutsPath + "/", string.Empty).Replace(".json", string.Empty);

            var pageOptions = new JsonSerializerOptions(JsonSerializerDefaults.Web);

            PageComponentConverter.SetAsyncLocalPageName(pageName);

            layoutModel.Pages[pageName] = JsonSerializer.Deserialize<PageComponent>(layout.RemoveBom(), pageOptions)!;
        }

        resources.Setup(r => r.GetLayoutModel(null)).Returns(layoutModel);

        services.AddTransient<IAppResources>((sp) => resources.Object);
        services.AddTransient<LayoutEvaluatorStateInitializer>();
        services.AddOptions<FrontEndSettings>().Configure(fes => fes.Add("test", "value"));

        var serviceProvider = services.BuildServiceProvider(validateScopes: true);

        var initializer = serviceProvider.GetRequiredService<LayoutEvaluatorStateInitializer>();

        return await initializer.Init(new Instance { Id = "123/" + Guid.NewGuid() }, model, null);
    }
}
using System.Text.Json;
using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.Data;
using Microsoft.Extensions.DependencyInjection;
using Xunit.Abstractions;

namespace Altinn.App.Core.Tests.LayoutExpressions.FullTests.CleanDataAccessor;

public class TestCleanDataAccessor
{
    private readonly ITestOutputHelper _outputHelper;

    public TestCleanDataAccessor(ITestOutputHelper outputHelper)
    {
        _outputHelper = outputHelper;
    }

    [Fact]
    public async Task TestEverythingEmpty()
    {
        var data = new MainModel();

        var (cleanModel, cleanSubModels) = await GetMainAndSubClean<MainModel, SubModel>(data, []);

        // Assert
        Assert.Empty(cleanSubModels);
        Assert.NotSame(cleanModel, data);
        Assert.Equivalent(data, cleanModel);
    }

    [Fact]
    public async Task TestEverythingHidden()
    {
        var data = new MainModel()
        {
            HideMainTitle = false,
            HidePage1 = true, // Everything is hidden
            MainTitle = "Title1",
            UnboundField = "Not deleted",
            MainComponentGroup = new()
            {
                new()
                {
                    AltinnRowId = Guid.NewGuid(),
                    Name = "Item 1",
                    Description = "Description 1",
                },
                new()
                {
                    AltinnRowId = Guid.NewGuid(),
                    Name = "Item 2",
                    Description = "Description 2",
                },
            },
        };

        var subData = new SubModel();

        var expectedModel = JsonSerializer.Deserialize<MainModel>(JsonSerializer.SerializeToUtf8Bytes(data))!;
        var (cleanModel, cleanSubModels) = await GetMainAndSubClean(data, [subData]);
        var cleanSubModel = cleanSubModels.Single();
        // Assert
        Assert.NotSame(cleanModel, data);
        Assert.NotSame(cleanSubModel, subData);

        // Make expected changes
        expectedModel.MainTitle = null;
        expectedModel.MainComponentGroup = null;

        Assert.Equivalent(expectedModel, cleanModel);
    }

    [Fact]
    public async Task TestHideRow2AndNameInRow1()
    {
        var data = new MainModel()
        {
            HidePage1 = false,

            MainComponentGroup = new()
            {
                new()
                {
                    AltinnRowId = Guid.NewGuid(),
                    HideName = true,
                    Name = "Item 1",
                    Description = "Description 1",
                },
                new()
                {
                    AltinnRowId = Guid.NewGuid(),
                    HideRow = true,
                    Name = "Item 2",
                    Description = "Description 2",
                },
                new()
                {
                    AltinnRowId = Guid.NewGuid(),
                    Name = "Item 2",
                    Description = "Description 2",
                },
            },
        };

        var expectedModel = JsonSerializer.Deserialize<MainModel>(JsonSerializer.SerializeToUtf8Bytes(data));
        var (cleanModel, cleanSubModels) = await GetMainAndSubClean<MainModel, SubModel>(data, []);

        // Assert
        Assert.Empty(cleanSubModels);
        Assert.NotSame(cleanModel, data);

        // Make expected changes
        // ReSharper disable PossibleNullReferenceException
#nullable disable
        expectedModel.MainComponentGroup[0].Name = null;
        expectedModel.MainComponentGroup[1] = null;
#nullable restore

        Assert.Equivalent(expectedModel, cleanModel);
    }

    [Fact]
    public async Task HideRowAndNameInSubComponent()
    {
        var data = new MainModel()
        {
            MainComponentGroup = new()
            {
                new()
                {
                    AltinnRowId = Guid.NewGuid(),
                    Name = "Item 1",
                    Description = "Description 1",
                },
                new()
                {
                    AltinnRowId = Guid.NewGuid(),
                    Name = "Item 2",
                    Description = "Description 2",
                },
                new()
                {
                    AltinnRowId = Guid.NewGuid(),
                    Name = "Item 2",
                    Description = "Description 2",
                },
            },
        };

        var sub1 = new SubModel()
        {
            HideSubPageTitle = true,
            SubPageTitle = "removeMe",
            HideSubComponentGroup = true,
            UnboundField = "Unbound",
            SubComponentGroup = new()
            {
                new()
                {
                    AltinnRowId = Guid.NewGuid(),
                    Name = "Name 1",
                    Description = "Description 1",
                },
                new()
                {
                    AltinnRowId = Guid.NewGuid(),
                    Name = "Name 2",
                    Description = "Description 2",
                },
                new()
                {
                    AltinnRowId = Guid.NewGuid(),
                    Name = "Name 3",
                    Description = "Description 3",
                },
            },
        };
        var sub2 = new SubModel()
        {
            SubPageTitle = "doNotRemove",
            UnboundField = "Unbound",
            SubComponentGroup = new()
            {
                new()
                {
                    AltinnRowId = Guid.NewGuid(),
                    HideName = true,
                    Name = "Name 1",
                    Description = "Description 1",
                },
                new()
                {
                    AltinnRowId = Guid.NewGuid(),
                    HideRow = true,
                    Name = "Name 2",
                    Description = "Description 2",
                },
                new()
                {
                    AltinnRowId = Guid.NewGuid(),
                    Name = "Name 3",
                    Description = "Description 3",
                },
            },
        };

        var expectedModel = JsonSerializer.Deserialize<MainModel>(JsonSerializer.SerializeToUtf8Bytes(data));
        var expectedSub1 = JsonSerializer.Deserialize<SubModel>(JsonSerializer.SerializeToUtf8Bytes(sub1));
        var expectedSub2 = JsonSerializer.Deserialize<SubModel>(JsonSerializer.SerializeToUtf8Bytes(sub2));
        var (cleanModel, cleanSubModels) = await GetMainAndSubClean<MainModel, SubModel>(data, [sub1, sub2]);

        // Assert
        Assert.Equal(2, cleanSubModels.Length);

        var cleanSub1 = cleanSubModels[0];
        var cleanSub2 = cleanSubModels[1];

        Assert.NotSame(cleanModel, data);
        Assert.NotSame(cleanSub1, sub1);
        Assert.NotSame(cleanSub2, sub2);
        Assert.NotSame(cleanSub1, sub2);
        Assert.NotSame(cleanSub2, sub1);

        // Make expected changes
        // ReSharper disable PossibleNullReferenceException
#nullable disable
        expectedSub1.SubPageTitle = null;
        expectedSub1.SubComponentGroup = null;
        expectedSub2.SubComponentGroup[0].Name = null;
        expectedSub2.SubComponentGroup[1] = null;
#nullable restore

        Assert.Equivalent(expectedModel, cleanModel);
        Assert.Equivalent(expectedSub1, cleanSub1);
        Assert.Equivalent(expectedSub2, cleanSub2);
    }

    private async Task<(T1?, T2?[])> GetMainAndSubClean<T1, T2>(T1 data, T2[] subDatas)
        where T1 : class
        where T2 : class
    {
        var fixture = await DataAccessorFixture.CreateAsync(
            [new("mainLayout", typeof(T1), MaxCount: 1), new("subLayout", typeof(T2), MaxCount: 0)],
            _outputHelper
        );
        fixture.AddFormData(data);
        foreach (var subData in subDatas)
        {
            fixture.AddFormData(subData);
        }
        await using var sp = fixture.BuildServiceProvider();
        var dataUnitOfWorkInitializer = sp.GetRequiredService<InstanceDataUnitOfWorkInitializer>();
        var dataMutator = await dataUnitOfWorkInitializer.Init(
            fixture.Instance,
            DataAccessorFixture.TaskId,
            "test-language"
        );

        var cleanDataAccessor = dataMutator.GetCleanAccessor();
        var mainModel = await cleanDataAccessor.GetFormData<T1>();
        var subModels = await cleanDataAccessor.GetAllFormData<T2>();
        return (mainModel, subModels);
    }
}

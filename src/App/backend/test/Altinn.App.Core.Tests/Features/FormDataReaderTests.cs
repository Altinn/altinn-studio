using System.Net;
using Altinn.App.Core.Features;
using Altinn.App.Core.Helpers;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Moq;

namespace Altinn.App.Core.Tests.Features;

public class FormDataReaderTests
{
    private readonly Mock<IDataProcessor> _dataProcessor = new();
    private readonly Mock<ILogger<FormDataReader>> _logger = new();

    private IFormDataReader CreateService()
    {
        var services = new ServiceCollection();
        services.AddSingleton<IHttpContextAccessor, HttpContextAccessor>();
        services.AddSingleton(_dataProcessor.Object);
        var appImplementationFactory = new AppImplementationFactory(services.BuildServiceProvider());
        return new FormDataReader(appImplementationFactory, _logger.Object);
    }

    [Fact]
    public async Task ReadFormData_RunsProcessDataRead()
    {
        var instance = new Instance();
        var dataElement = new DataElement { Id = Guid.NewGuid().ToString(), DataType = "model" };
        var model = new TestModel();

        var service = CreateService();
        await service.ProcessLoadedFormData(instance, dataElement, model, language: "nb");

        _dataProcessor.Verify(
            x => x.ProcessDataRead(instance, It.Is<Guid?>(g => g == Guid.Parse(dataElement.Id)), model, "nb"),
            Times.Once
        );
    }

    [Fact]
    public async Task ReadFormData_PersistsMutationsFromProcessDataRead()
    {
        var instance = new Instance();
        var dataElement = new DataElement
        {
            Id = Guid.NewGuid().ToString(),
            DataType = "model",
            Locked = false,
        };
        var model = new TestModel { Name = "before" };
        _dataProcessor
            .Setup(x => x.ProcessDataRead(instance, It.IsAny<Guid?>(), model, It.IsAny<string?>()))
            .Callback(() => model.Name = "after")
            .Returns(Task.CompletedTask);

        var persistedModel = (object?)null;

        var service = CreateService();
        await service.ProcessLoadedFormData(
            instance,
            dataElement,
            model,
            persistFormData: (updatedModel, _) =>
            {
                persistedModel = updatedModel;
                return Task.CompletedTask;
            }
        );

        Assert.Same(model, persistedModel);
    }

    public static TheoryData<Instance> IdleInstances =>
        new()
        {
            new Instance(),
            new Instance { Process = new ProcessState { Status = null } },
            new Instance { Process = new ProcessState { Status = ProcessStatus.Idle } },
        };

    [Theory]
    [MemberData(nameof(IdleInstances))]
    public async Task ReadFormData_WithRowIdsAndIdleStatus_InitializesOnceAndPersistsOnlyTheChange(Instance instance)
    {
        var dataElement = new DataElement
        {
            Id = Guid.NewGuid().ToString(),
            DataType = "model",
            Locked = false,
        };
        var model = new TestModel { Rows = [new TestRow()] };
        int persistCount = 0;
        Guid persistedRowId = Guid.Empty;

        var service = CreateService();
        for (int read = 0; read < 2; read++)
        {
            await service.ProcessLoadedFormData(
                instance,
                dataElement,
                model,
                includeRowId: true,
                persistFormData: (updatedModel, _) =>
                {
                    persistCount++;
                    persistedRowId = Assert.IsType<TestModel>(updatedModel).Rows.Single().AltinnRowId;
                    return Task.CompletedTask;
                }
            );
        }

        Assert.NotEqual(Guid.Empty, model.Rows.Single().AltinnRowId);
        Assert.Equal(model.Rows.Single().AltinnRowId, persistedRowId);
        Assert.Equal(1, persistCount);
    }

    [Theory]
    [InlineData(ProcessStatus.Processing)]
    public async Task ReadFormData_WithRowIdsAndNonIdleStatus_RunsReadHookWithoutInitializingOrPersisting(
        ProcessStatus status
    )
    {
        var instance = new Instance { Process = new ProcessState { Status = status } };
        var dataElement = new DataElement
        {
            Id = Guid.NewGuid().ToString(),
            DataType = "model",
            Locked = false,
        };
        var model = new TestModel { Name = "stored", Rows = [new TestRow()] };
        _dataProcessor
            .Setup(x => x.ProcessDataRead(instance, It.IsAny<Guid?>(), model, It.IsAny<string?>()))
            .Callback(() =>
            {
                Assert.Equal(Guid.Empty, model.Rows.Single().AltinnRowId);
                model.Name = "from-hook";
            })
            .Returns(Task.CompletedTask);
        int persistCount = 0;

        var service = CreateService();
        await service.ProcessLoadedFormData(
            instance,
            dataElement,
            model,
            includeRowId: true,
            persistFormData: (_, _) =>
            {
                persistCount++;
                return Task.CompletedTask;
            }
        );

        Assert.Equal("from-hook", model.Name);
        Assert.Equal(Guid.Empty, model.Rows.Single().AltinnRowId);
        Assert.Equal(0, persistCount);
        _dataProcessor.Verify(x => x.ProcessDataRead(instance, Guid.Parse(dataElement.Id), model, null), Times.Once);
    }

    [Fact]
    public async Task ReadFormData_WithPreexistingRowIdsAndIdleStatus_DoesNotPersist()
    {
        var existingRowId = Guid.NewGuid();
        var instance = new Instance { Process = new ProcessState { Status = ProcessStatus.Idle } };
        var dataElement = new DataElement
        {
            Id = Guid.NewGuid().ToString(),
            DataType = "model",
            Locked = false,
        };
        var model = new TestModel { Rows = [new TestRow { AltinnRowId = existingRowId }] };
        int persistCount = 0;

        var service = CreateService();
        await service.ProcessLoadedFormData(
            instance,
            dataElement,
            model,
            includeRowId: true,
            persistFormData: (_, _) =>
            {
                persistCount++;
                return Task.CompletedTask;
            }
        );

        Assert.Equal(existingRowId, model.Rows.Single().AltinnRowId);
        Assert.Equal(0, persistCount);
    }

    [Fact]
    public async Task ReadFormData_WithRowIdsAndNonIdleStatus_PreservesExistingRowIdsWithoutPersisting()
    {
        var existingRowId = Guid.NewGuid();
        var instance = new Instance { Process = new ProcessState { Status = ProcessStatus.Processing } };
        var dataElement = new DataElement
        {
            Id = Guid.NewGuid().ToString(),
            DataType = "model",
            Locked = false,
        };
        var model = new TestModel { Rows = [new TestRow { AltinnRowId = existingRowId }] };
        int persistCount = 0;

        var service = CreateService();
        await service.ProcessLoadedFormData(
            instance,
            dataElement,
            model,
            includeRowId: true,
            persistFormData: (_, _) =>
            {
                persistCount++;
                return Task.CompletedTask;
            }
        );

        Assert.Equal(existingRowId, model.Rows.Single().AltinnRowId);
        Assert.Equal(0, persistCount);
    }

    [Theory]
    [InlineData(ProcessStatus.Processing)]
    public async Task ReadFormData_WithoutRowIdsAndNonIdleStatus_RunsReadHookWithoutPersisting(ProcessStatus status)
    {
        var existingRowId = Guid.NewGuid();
        var instance = new Instance { Process = new ProcessState { Status = status } };
        var dataElement = new DataElement
        {
            Id = Guid.NewGuid().ToString(),
            DataType = "model",
            Locked = false,
        };
        var model = new TestModel { Name = "stored", Rows = [new TestRow { AltinnRowId = existingRowId }] };
        _dataProcessor
            .Setup(x => x.ProcessDataRead(instance, It.IsAny<Guid?>(), model, It.IsAny<string?>()))
            .Callback(() =>
            {
                Assert.Equal(existingRowId, model.Rows.Single().AltinnRowId);
                model.Name = "from-hook";
            })
            .Returns(Task.CompletedTask);
        int persistCount = 0;

        var service = CreateService();
        await service.ProcessLoadedFormData(
            instance,
            dataElement,
            model,
            includeRowId: false,
            persistFormData: (updatedModel, _) =>
            {
                persistCount++;
                return Task.CompletedTask;
            }
        );

        Assert.Equal("from-hook", model.Name);
        Assert.Equal(Guid.Empty, model.Rows.Single().AltinnRowId);
        Assert.Equal(0, persistCount);
        _dataProcessor.Verify(x => x.ProcessDataRead(instance, Guid.Parse(dataElement.Id), model, null), Times.Once);
    }

    [Fact]
    public async Task ReadFormData_WhenRowIdPersistenceIsForbidden_ReturnsInitializedModel()
    {
        var instance = new Instance { Process = new ProcessState { Status = ProcessStatus.Idle } };
        var dataElement = new DataElement
        {
            Id = Guid.NewGuid().ToString(),
            DataType = "model",
            Locked = false,
        };
        var model = new TestModel { Rows = [new TestRow()] };
        var exception = new PlatformHttpException(HttpStatusCode.Forbidden, "Write forbidden");

        var service = CreateService();
        object result = await service.ProcessLoadedFormData(
            instance,
            dataElement,
            model,
            includeRowId: true,
            persistFormData: (_, _) => Task.FromException(exception)
        );

        Assert.Same(model, result);
        Assert.NotEqual(Guid.Empty, model.Rows.Single().AltinnRowId);
    }

    [Fact]
    public async Task ReadFormData_WhenFormDataIsMissing_ThrowsBadRequest()
    {
        var instance = new Instance();
        var dataElement = new DataElement { Id = Guid.NewGuid().ToString(), DataType = "model" };

        var service = CreateService();
        var exception = await Assert.ThrowsAsync<ServiceException>(() =>
            service.ProcessLoadedFormData(instance, dataElement, appModel: null)
        );

        Assert.Equal(HttpStatusCode.BadRequest, exception.StatusCode);
        Assert.Equal($"Form data for data element '{dataElement.Id}' could not be loaded.", exception.Message);
        _dataProcessor.Verify(
            x => x.ProcessDataRead(It.IsAny<Instance>(), It.IsAny<Guid?>(), It.IsAny<object>(), It.IsAny<string?>()),
            Times.Never
        );
    }

    private sealed class TestModel
    {
        public string? Name { get; set; }

        public List<TestRow> Rows { get; set; } = [];
    }

    private sealed class TestRow
    {
        public Guid AltinnRowId { get; set; }
    }
}

using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.Data;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Moq;

namespace Altinn.App.Core.Tests.Features;

public class FormDataReaderTests
{
    private readonly Mock<IDataClient> _dataClient = new();
    private readonly Mock<IDataProcessor> _dataProcessor = new();
    private readonly Mock<ILogger<FormDataReader>> _logger = new();

    private IFormDataReader CreateService()
    {
        var services = new ServiceCollection();
        services.AddSingleton<IHttpContextAccessor, HttpContextAccessor>();
        services.AddSingleton(_dataProcessor.Object);
        var appImplementationFactory = new AppImplementationFactory(services.BuildServiceProvider());
        return new FormDataReader(_dataClient.Object, appImplementationFactory, _logger.Object);
    }

    [Fact]
    public async Task ReadFormData_RunsProcessDataRead()
    {
        var instance = new Instance();
        var dataElement = new DataElement { Id = Guid.NewGuid().ToString(), DataType = "model" };
        var model = new TestModel();
        _dataClient
            .Setup(x => x.GetFormData(instance, dataElement, null, It.IsAny<CancellationToken>()))
            .ReturnsAsync(model);

        var service = CreateService();
        await service.ReadInstanceFormData(instance, dataElement, language: "nb");

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

        _dataClient
            .Setup(x => x.GetFormData(instance, dataElement, null, It.IsAny<CancellationToken>()))
            .ReturnsAsync(model);
        _dataProcessor
            .Setup(x => x.ProcessDataRead(instance, It.IsAny<Guid?>(), model, It.IsAny<string?>()))
            .Callback(() => model.Name = "after")
            .Returns(Task.CompletedTask);

        var service = CreateService();
        await service.ReadInstanceFormData(instance, dataElement);

        _dataClient.Verify(
            x => x.UpdateFormData(instance, model, dataElement, null, It.IsAny<CancellationToken>()),
            Times.Once
        );
    }

    private sealed class TestModel
    {
        public string? Name { get; set; }
    }
}

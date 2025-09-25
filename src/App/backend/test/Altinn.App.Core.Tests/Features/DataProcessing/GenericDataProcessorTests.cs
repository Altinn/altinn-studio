using Altinn.App.Core.Features.DataProcessing;
using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;

namespace Altinn.App.Core.Tests.Features.DataProcessing;

public class GenericDataProcessorTests
{
    private class DummyModel { }

    private class WrongModel { }

    private class DummyProcessor : GenericDataProcessor<DummyModel>
    {
        public bool ReadCalled { get; set; } = false;

        public bool WriteCalled { get; set; } = false;

        public override Task ProcessDataRead(Instance instance, Guid? dataId, DummyModel model, string? langauge)
        {
            ReadCalled = true;
            return Task.CompletedTask;
        }

        public override Task ProcessDataWrite(
            Instance instance,
            Guid? dataId,
            DummyModel model,
            DummyModel? previousModel,
            string? language
        )
        {
            WriteCalled = true;
            return Task.CompletedTask;
        }
    }

    [Fact]
    public async Task ShouldRunForCorrectType()
    {
        var processor = new DummyProcessor();
        var data = new DummyModel();
        await processor.ProcessDataRead(new Instance(), dataId: null, (object)data, language: null);
        processor.ReadCalled.Should().BeTrue();
        processor.WriteCalled.Should().BeFalse();
        await processor.ProcessDataWrite(new Instance(), null, (object)data, null, null);
        processor.ReadCalled.Should().BeTrue();
        processor.WriteCalled.Should().BeTrue();
    }

    [Fact]
    public async Task ShouldNotRunForIncorrectType()
    {
        var processor = new DummyProcessor();
        var data = new WrongModel();
        await processor.ProcessDataRead(new Instance(), dataId: null, (object)data, language: null);
        processor.ReadCalled.Should().BeFalse();
        processor.WriteCalled.Should().BeFalse();
        await processor.ProcessDataWrite(new Instance(), null, (object)data, null, null);
        processor.ReadCalled.Should().BeFalse();
        processor.WriteCalled.Should().BeFalse();
    }
}

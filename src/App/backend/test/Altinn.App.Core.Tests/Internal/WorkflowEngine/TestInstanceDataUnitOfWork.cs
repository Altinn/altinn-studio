using Altinn.App.Core.Configuration;
using Altinn.App.Core.Helpers.Serialization;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Storage;
using Altinn.App.Core.Internal.Texts;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Options;
using Moq;

namespace Altinn.App.Core.Tests.Internal.WorkflowEngine;

/// <summary>
/// Builds the <see cref="InstanceDataUnitOfWork"/> a workflow callback restores, over clients that are never
/// called, for command tests that read what a command staged rather than what reached Storage.
/// </summary>
internal static class TestInstanceDataUnitOfWork
{
    internal static InstanceDataUnitOfWork Create(Instance instance)
    {
        var dataClient = new Mock<IDataClientWithStorageMetadata>(MockBehavior.Strict);
        // Before the first Object read, which fixes the interfaces the mock implements.
        IInstanceMutationClient mutationClient = dataClient.As<IInstanceMutationClient>().Object;
        return new InstanceDataUnitOfWork(
            instance,
            new StorageVersionMetadata(InstanceVersion: 12, ProcessStateVersion: 8),
            dataClient.Object,
            mutationClient,
            Mock.Of<IInstanceClientWithStorageMetadata>(MockBehavior.Strict),
            new ApplicationMetadata(instance.AppId) { DataTypes = [] },
            Mock.Of<ITranslationService>(),
            new ModelSerializationService(null!),
            Mock.Of<IAppResources>(),
            Options.Create(new FrontEndSettings()),
            taskId: instance.Process?.CurrentTask?.ElementId,
            language: null
        );
    }
}

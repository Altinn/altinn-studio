using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.Pdf;
using Altinn.Platform.Storage.Interface.Models;
using Moq;
using Xunit;

namespace Altinn.App.Core.Tests.Internal.Pdf;

public class IPdfServiceCompatibilityTests
{
    [Fact]
    public async Task AccessorOverload_DelegatesToExistingInstanceOverload()
    {
        Instance instance = new();
        var dataAccessor = new Mock<IInstanceDataAccessor>();
        dataAccessor.SetupGet(accessor => accessor.Instance).Returns(instance);
        const string taskId = "Task_1";
        const bool isPreview = true;
        StorageAuthenticationMethod authenticationMethod = StorageAuthenticationMethod.ServiceOwner();
        using var cancellationTokenSource = new CancellationTokenSource();
        CancellationToken cancellationToken = cancellationTokenSource.Token;
        using var expectedStream = new MemoryStream();
        var implementation = new ExistingPdfServiceImplementation(expectedStream);
        IPdfService pdfService = implementation;

        Stream result = await pdfService.GeneratePdf(
            dataAccessor.Object,
            taskId,
            isPreview,
            authenticationMethod,
            cancellationToken
        );

        Assert.Same(expectedStream, result);
        Assert.True(implementation.Call.HasValue);
        var call = implementation.Call.Value;
        Assert.Same(instance, call.Instance);
        Assert.Equal(taskId, call.TaskId);
        Assert.Equal(isPreview, call.IsPreview);
        Assert.Same(authenticationMethod, call.AuthenticationMethod);
        Assert.Equal(cancellationToken, call.CancellationToken);
    }

    private sealed class ExistingPdfServiceImplementation(Stream result) : IPdfService
    {
        public (
            Instance Instance,
            string TaskId,
            bool IsPreview,
            StorageAuthenticationMethod? AuthenticationMethod,
            CancellationToken CancellationToken
        )? Call { get; private set; }

        public Task GenerateAndStorePdf(
            IInstanceDataMutator instanceDataMutator,
            StorageAuthenticationMethod? authenticationMethod = null,
            CancellationToken ct = default
        ) => throw new NotSupportedException();

        public Task<Stream> GeneratePdf(Instance instance, string taskId, CancellationToken ct) =>
            throw new NotSupportedException();

        public Task<Stream> GeneratePdf(
            Instance instance,
            string taskId,
            bool isPreview,
            StorageAuthenticationMethod? authenticationMethod = null,
            CancellationToken ct = default
        )
        {
            Call = (instance, taskId, isPreview, authenticationMethod, ct);
            return Task.FromResult(result);
        }
    }
}

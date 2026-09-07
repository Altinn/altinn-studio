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

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task PreviewOverload_ForCurrentTask_DelegatesToExistingInstanceOverload(bool emptyAutoPdfTaskIds)
    {
        const string taskId = "Task_1";
        var instance = new Instance
        {
            Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = taskId } },
        };
        var target = new PdfPreviewTarget(taskId, null, emptyAutoPdfTaskIds ? [] : null, null);
        using var cancellationTokenSource = new CancellationTokenSource();
        CancellationToken cancellationToken = cancellationTokenSource.Token;
        using var expectedStream = new MemoryStream();
        var implementation = new ExistingPdfServiceImplementation(expectedStream);
        IPdfService pdfService = implementation;

        Stream result = await pdfService.GeneratePreviewPdf(instance, target, cancellationToken);

        Assert.Same(expectedStream, result);
        Assert.True(implementation.Call.HasValue);
        var call = implementation.Call.Value;
        Assert.Same(instance, call.Instance);
        Assert.Equal(taskId, call.TaskId);
        Assert.True(call.IsPreview);
        Assert.Null(call.AuthenticationMethod);
        Assert.Equal(cancellationToken, call.CancellationToken);
    }

    [Theory]
    [InlineData("subform", "subform PDF previews")]
    [InlineData("autoPdf", "autoPdfTaskIds")]
    [InlineData("otherTask", "current task")]
    public async Task PreviewOverload_ForUnsupportedTarget_ThrowsWithoutCallingExistingOverload(
        string targetKind,
        string expectedMessage
    )
    {
        const string currentTaskId = "Task_1";
        var instance = new Instance
        {
            Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = currentTaskId } },
        };
        PdfPreviewTarget target = targetKind switch
        {
            "subform" => new(
                currentTaskId,
                null,
                null,
                new SubformPdfRenderTarget("Subform", "SubformData", "element-1")
            ),
            "autoPdf" => new(currentTaskId, null, ["Task_Data"], null),
            "otherTask" => new("Task_2", "Task_2", null, null),
            _ => throw new ArgumentOutOfRangeException(nameof(targetKind)),
        };
        using var stream = new MemoryStream();
        var implementation = new ExistingPdfServiceImplementation(stream);
        IPdfService pdfService = implementation;

        var exception = await Assert.ThrowsAsync<PdfPreviewException>(() =>
            pdfService.GeneratePreviewPdf(instance, target, CancellationToken.None)
        );

        Assert.Equal(501, exception.StatusCode);
        Assert.Contains("registered IPdfService implementation", exception.Message);
        Assert.Contains(expectedMessage, exception.Message);
        Assert.Null(implementation.Call);
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

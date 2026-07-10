using System.Text.Json;
using Altinn.App.Core.Infrastructure.Clients.Secrets;
using Altinn.App.Core.Internal.WorkflowEngine;
using Altinn.App.Core.Internal.WorkflowEngine.Authentication;
using Altinn.App.Core.Internal.WorkflowEngine.Models;
using Altinn.Platform.Storage.Interface.Models;
using Moq;

namespace Altinn.App.Core.Tests.Internal.WorkflowEngine;

public class WorkflowCallbackStateRewriterTests
{
    private static readonly AppCode TestSigningCode = new()
    {
        Id = "test-secret",
        Code = "test-secret-code-long-enough-for-hmac",
        IssuedAt = DateTimeOffset.UtcNow.AddDays(-1),
        ExpiresAt = DateTimeOffset.UtcNow.AddDays(186),
    };

    private static readonly WorkflowStateSigner Signer = CreateSigner();

    private static WorkflowStateSigner CreateSigner()
    {
        var secretProviderMock = new Mock<IWorkflowCallbackSecretProvider>();
        secretProviderMock.Setup(x => x.GetSigningSecret()).Returns(TestSigningCode);
        secretProviderMock.Setup(x => x.GetValidationSecrets()).Returns([TestSigningCode]);
        return new WorkflowStateSigner(secretProviderMock.Object);
    }

    private static string SignState(WorkflowCallbackState state) => Signer.Sign(JsonSerializer.Serialize(state));

    private static WorkflowCallbackState CreateState(ProcessState process) =>
        new()
        {
            Instance = new Instance
            {
                Id = "1337/aabbccdd-1234-5678-9012-aabbccddeeff",
                AppId = "ttd/test-app",
                Org = "ttd",
                InstanceOwner = new InstanceOwner { PartyId = "1337" },
                Process = process,
                Data = [],
            },
            FormData =
            [
                new FormDataEntry
                {
                    Id = "form-data-id",
                    DataType = "model",
                    Data = JsonSerializer.SerializeToElement(new { field = "value" }),
                },
            ],
        };

    [Fact]
    public void WithProcessState_ReplacesProcessAndPreservesEverythingElse()
    {
        var oldProcess = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = "Task_1" } };
        var newProcess = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = "Task_2" } };
        string signedState = SignState(CreateState(oldProcess));
        var rewriter = new WorkflowCallbackStateRewriter(Signer);

        string rewritten = rewriter.WithProcessState(signedState, newProcess);

        // The result verifies with the same signer and carries the NEW process state.
        var restored = JsonSerializer.Deserialize<WorkflowCallbackState>(Signer.Verify(rewritten))!;
        Assert.Equal("Task_2", restored.Instance.Process?.CurrentTask?.ElementId);

        // Instance identity and form data are carried over unchanged.
        Assert.Equal("1337/aabbccdd-1234-5678-9012-aabbccddeeff", restored.Instance.Id);
        var formDataEntry = Assert.Single(restored.FormData);
        Assert.Equal("form-data-id", formDataEntry.Id);
        Assert.Equal("value", formDataEntry.Data.GetProperty("field").GetString());
    }

    [Fact]
    public void WithProcessState_SetsEndEventForProcessEndTransitions()
    {
        var oldProcess = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = "Task_1" } };
        var newProcess = new ProcessState { CurrentTask = null, EndEvent = "EndEvent_1" };
        string signedState = SignState(CreateState(oldProcess));
        var rewriter = new WorkflowCallbackStateRewriter(Signer);

        string rewritten = rewriter.WithProcessState(signedState, newProcess);

        var restored = JsonSerializer.Deserialize<WorkflowCallbackState>(Signer.Verify(rewritten))!;
        Assert.Null(restored.Instance.Process?.CurrentTask);
        Assert.Equal("EndEvent_1", restored.Instance.Process?.EndEvent);
    }

    [Fact]
    public void WithProcessState_TamperedBlob_Throws()
    {
        var rewriter = new WorkflowCallbackStateRewriter(Signer);
        var newProcess = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = "Task_2" } };

        Assert.Throws<WorkflowCallbackStateException>(() =>
            rewriter.WithProcessState("""{"payload":"{}","signature":"bogus","secretId":"test-secret"}""", newProcess)
        );
    }
}

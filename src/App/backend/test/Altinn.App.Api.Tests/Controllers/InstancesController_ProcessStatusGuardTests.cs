using Altinn.App.Api.Controllers;
using Altinn.App.Core.Internal.Instances;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using Moq;

namespace Altinn.App.Api.Tests.Controllers;

public sealed class InstancesControllerProcessStatusGuardTests
{
    private const string Org = "ttd";
    private const string App = "process-version-admission";
    private const int InstanceOwnerPartyId = 501337;
    private static readonly Guid _instanceGuid = new("d2af1cfd-db99-45f9-9625-9dfa1223485f");

    [Theory]
    [InlineData("complete", "processing")]
    [InlineData("substatus", "future-status")]
    [InlineData("soft-delete", "processing")]
    [InlineData("hard-delete", "future-status")]
    public async Task DirectInstanceMutation_WhenStatusBlocks_ReturnsSharedProblemWithoutWrite(
        string operation,
        string processStatus
    )
    {
        using InstancesControllerFixture fixture = InstancesControllerFixture.Create();
        var controller = fixture.ServiceProvider.GetRequiredService<InstancesController>();
        controller.ControllerContext.RouteData = new RouteData();
        controller.ControllerContext.RouteData.Values["org"] = Org;
        controller.ControllerContext.RouteData.Values["app"] = App;
        fixture
            .Mock<HttpContext>()
            .SetupGet(context => context.User)
            .Returns(TestAuthentication.GetServiceOwnerPrincipal(org: Org));

        var instance = new Instance
        {
            Id = $"{InstanceOwnerPartyId}/{_instanceGuid}",
            AppId = $"{Org}/{App}",
            Org = Org,
            InstanceOwner = new InstanceOwner { PartyId = InstanceOwnerPartyId.ToString() },
            Process = new ProcessState { Status = processStatus },
        };
        fixture
            .Mock<IInstanceClient>()
            .Setup(client =>
                client.GetInstance(
                    App,
                    Org,
                    InstanceOwnerPartyId,
                    _instanceGuid,
                    It.IsAny<Altinn.App.Core.Features.StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(instance);

        ActionResult<Instance> result = operation switch
        {
            "complete" => await controller.AddCompleteConfirmation(InstanceOwnerPartyId, _instanceGuid),
            "substatus" => await controller.UpdateSubstatus(
                Org,
                App,
                InstanceOwnerPartyId,
                _instanceGuid,
                new Substatus { Label = "blocked" }
            ),
            "soft-delete" => await controller.DeleteInstance(InstanceOwnerPartyId, _instanceGuid, hard: false),
            "hard-delete" => await controller.DeleteInstance(InstanceOwnerPartyId, _instanceGuid, hard: true),
            _ => throw new ArgumentOutOfRangeException(nameof(operation), operation, null),
        };

        var conflict = Assert.IsType<JsonResult>(result.Result);
        Assert.Equal(StatusCodes.Status409Conflict, conflict.StatusCode);
        Assert.Equal("application/problem+json", conflict.ContentType);
        var problem = Assert.IsType<ProblemDetails>(conflict.Value);
        Assert.Equal("instance-processing", problem.Type);
        Assert.Equal(StatusCodes.Status409Conflict, problem.Status);
        Assert.Equal(processStatus, problem.Extensions["processStatus"]);
        fixture.Mock<IInstanceClient>().VerifyAll();
        fixture.Mock<IInstanceClient>().VerifyNoOtherCalls();
        fixture.Mock<Altinn.App.Core.Internal.Events.IEventsClient>().VerifyNoOtherCalls();
    }
}

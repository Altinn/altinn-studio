using Altinn.App.Core.Internal.AccessManagement.Exceptions;
using Altinn.App.Core.Internal.AccessManagement.Models;
using Altinn.App.Core.Internal.AccessManagement.Models.Shared;

namespace Altinn.App.Core.Tests.Internal.AccessManagement;

public class DelegationRequestTests
{
    [Fact]
    public void ConvertToDto_WithValidDelegationRequest_ReturnsCorrectDto()
    {
        // Arrange
        var delegationRequest = new DelegationRequest
        {
            From = new DelegationParty { Type = DelegationConst.Party, Value = "12345678-1234-1234-1234-123456789012" },
            To = new DelegationParty { Type = DelegationConst.Party, Value = "87654321-4321-4321-4321-210987654321" },
            ResourceId = "testapp",
            InstanceId = "instanceOwner/12345678-1234-1234-1234-123456789012",
            Rights =
            [
                new()
                {
                    Resource = [new AppResource { Value = "testorg/testapp" }, new TaskResource { Value = "signing" }],
                    Action = new AltinnAction { Type = DelegationConst.ActionId, Value = ActionType.Sign },
                },
            ],
        };

        // Act
        var result = DelegationRequest.ConvertToDto(delegationRequest);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(delegationRequest.From.Type, result.From.Type);
        Assert.Equal(delegationRequest.From.Value, result.From.Value);
        Assert.Equal(delegationRequest.To.Type, result.To.Type);
        Assert.Equal(delegationRequest.To.Value, result.To.Value);
        Assert.Single(result.Rights);

        var rightDto = result.Rights.First();
        Assert.Equal(2, rightDto.Resource.Count);
        Assert.Equal(DelegationConst.App, rightDto.Resource[0].Type);
        Assert.Equal("testorg/testapp", rightDto.Resource[0].Value);
        Assert.Equal(DelegationConst.Task, rightDto.Resource[1].Type);
        Assert.Equal("signing", rightDto.Resource[1].Value);
        Assert.Equal(DelegationConst.ActionId, rightDto.Action.Type);
        Assert.Equal(ActionType.Sign, rightDto.Action.Value);
    }

    [Fact]
    public void ConvertToDto_WithMultipleRights_ReturnsCorrectDto()
    {
        // Arrange
        var delegationRequest = new DelegationRequest
        {
            From = new DelegationParty { Type = DelegationConst.Party, Value = "12345678-1234-1234-1234-123456789012" },
            To = new DelegationParty { Type = DelegationConst.Party, Value = "87654321-4321-4321-4321-210987654321" },
            ResourceId = "testapp",
            InstanceId = "instanceOwner/12345678-1234-1234-1234-123456789012",
            Rights =
            [
                new()
                {
                    Resource = [new AppResource { Value = "testorg/testapp" }],
                    Action = new AltinnAction { Type = DelegationConst.ActionId, Value = ActionType.Read },
                },
                new()
                {
                    Resource = [new TaskResource { Value = "signing" }],
                    Action = new AltinnAction { Type = DelegationConst.ActionId, Value = ActionType.Sign },
                },
            ],
        };

        // Act
        var result = DelegationRequest.ConvertToDto(delegationRequest);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(2, result.Rights.Count());

        var firstRight = result.Rights.First();
        Assert.Single(firstRight.Resource);
        Assert.Equal(DelegationConst.App, firstRight.Resource[0].Type);
        Assert.Equal("testorg/testapp", firstRight.Resource[0].Value);
        Assert.Equal(ActionType.Read, firstRight.Action.Value);

        var secondRight = result.Rights.Skip(1).First();
        Assert.Single(secondRight.Resource);
        Assert.Equal(DelegationConst.Task, secondRight.Resource[0].Type);
        Assert.Equal("signing", secondRight.Resource[0].Value);
        Assert.Equal(ActionType.Sign, secondRight.Action.Value);
    }

    [Fact]
    public void ConvertToDto_WithEmptyRights_ReturnsEmptyRightsCollection()
    {
        // Arrange
        var delegationRequest = new DelegationRequest
        {
            From = new DelegationParty { Type = DelegationConst.Party, Value = "12345678-1234-1234-1234-123456789012" },
            To = new DelegationParty { Type = DelegationConst.Party, Value = "87654321-4321-4321-4321-210987654321" },
            ResourceId = "testapp",
            InstanceId = "instanceOwner/12345678-1234-1234-1234-123456789012",
            Rights = [],
        };

        // Act
        var result = DelegationRequest.ConvertToDto(delegationRequest);

        // Assert
        Assert.NotNull(result);
        Assert.Empty(result.Rights);
    }

    [Fact]
    public void ConvertToDto_WithNullFrom_ThrowsAccessManagementArgumentException()
    {
        // Arrange
        var delegationRequest = new DelegationRequest
        {
            From = null, // Null From
            To = new DelegationParty { Type = DelegationConst.Party, Value = "87654321-4321-4321-4321-210987654321" },
            ResourceId = "testapp",
            InstanceId = "instanceOwner/12345678-1234-1234-1234-123456789012",
            Rights = [],
        };

        // Act & Assert
        var exception = Assert.Throws<AccessManagementArgumentException>(() =>
            DelegationRequest.ConvertToDto(delegationRequest)
        );
        Assert.Equal("From is required", exception.Message);
    }

    [Fact]
    public void ConvertToDto_WithNullTo_ThrowsAccessManagementArgumentException()
    {
        // Arrange
        var delegationRequest = new DelegationRequest
        {
            From = new DelegationParty { Type = DelegationConst.Party, Value = "12345678-1234-1234-1234-123456789012" },
            To = null, // Null To
            ResourceId = "testapp",
            InstanceId = "instanceOwner/12345678-1234-1234-1234-123456789012",
            Rights = [],
        };

        // Act & Assert
        var exception = Assert.Throws<AccessManagementArgumentException>(() =>
            DelegationRequest.ConvertToDto(delegationRequest)
        );
        Assert.Equal("To is required", exception.Message);
    }

    [Fact]
    public void ConvertToDto_WithNullActionInRights_ThrowsAccessManagementArgumentException()
    {
        // Arrange
        var delegationRequest = new DelegationRequest
        {
            From = new DelegationParty { Type = DelegationConst.Party, Value = "12345678-1234-1234-1234-123456789012" },
            To = new DelegationParty { Type = DelegationConst.Party, Value = "87654321-4321-4321-4321-210987654321" },
            ResourceId = "testapp",
            InstanceId = "instanceOwner/12345678-1234-1234-1234-123456789012",
            Rights =
            [
                new()
                {
                    Resource = [new AppResource { Value = "testorg/testapp" }],
                    Action = null, // Null Action
                },
            ],
        };

        // Act & Assert
        var exception = Assert.Throws<AccessManagementArgumentException>(() =>
            DelegationRequest.ConvertToDto(delegationRequest)
        );
        Assert.Equal("Action is required", exception.Message);
    }

    [Fact]
    public void ConvertToDto_WithDifferentResourceTypes_MapsCorrectly()
    {
        // Arrange
        var delegationRequest = new DelegationRequest
        {
            From = new DelegationParty { Type = DelegationConst.Party, Value = "12345678-1234-1234-1234-123456789012" },
            To = new DelegationParty { Type = DelegationConst.Party, Value = "87654321-4321-4321-4321-210987654321" },
            ResourceId = "testapp",
            InstanceId = "instanceOwner/12345678-1234-1234-1234-123456789012",
            Rights =
            [
                new()
                {
                    Resource =
                    [
                        new AppResource { Value = "testorg/testapp" },
                        new OrgResource { Value = "testorg" },
                        new TaskResource { Value = "signing" },
                        new Resource { Value = "generic-resource" },
                    ],
                    Action = new AltinnAction { Type = DelegationConst.ActionId, Value = ActionType.Write },
                },
            ],
        };

        // Act
        var result = DelegationRequest.ConvertToDto(delegationRequest);

        // Assert
        Assert.NotNull(result);
        Assert.Single(result.Rights);

        var rightDto = result.Rights.First();
        Assert.Equal(4, rightDto.Resource.Count);

        Assert.Equal(DelegationConst.App, rightDto.Resource[0].Type);
        Assert.Equal("testorg/testapp", rightDto.Resource[0].Value);

        Assert.Equal(DelegationConst.Org, rightDto.Resource[1].Type);
        Assert.Equal("testorg", rightDto.Resource[1].Value);

        Assert.Equal(DelegationConst.Task, rightDto.Resource[2].Type);
        Assert.Equal("signing", rightDto.Resource[2].Value);

        Assert.Equal(DelegationConst.Resource, rightDto.Resource[3].Type);
        Assert.Equal("generic-resource", rightDto.Resource[3].Value);
    }

    [Fact]
    public void ConvertToDto_WithCustomActionType_MapsCorrectly()
    {
        // Arrange
        var customActionType = "custom:action:type";
        var delegationRequest = new DelegationRequest
        {
            From = new DelegationParty { Type = DelegationConst.Party, Value = "12345678-1234-1234-1234-123456789012" },
            To = new DelegationParty { Type = DelegationConst.Party, Value = "87654321-4321-4321-4321-210987654321" },
            ResourceId = "testapp",
            InstanceId = "instanceOwner/12345678-1234-1234-1234-123456789012",
            Rights =
            [
                new()
                {
                    Resource = [new AppResource { Value = "testorg/testapp" }],
                    Action = new AltinnAction { Type = customActionType, Value = "custom-action" },
                },
            ],
        };

        // Act
        var result = DelegationRequest.ConvertToDto(delegationRequest);

        // Assert
        Assert.NotNull(result);
        Assert.Single(result.Rights);

        var rightDto = result.Rights.First();
        Assert.Equal(customActionType, rightDto.Action.Type);
        Assert.Equal("custom-action", rightDto.Action.Value);
    }

    [Fact]
    public void ConvertToDto_WithRightContainingEmptyResourceList_MapsCorrectly()
    {
        // Arrange
        var delegationRequest = new DelegationRequest
        {
            From = new DelegationParty { Type = DelegationConst.Party, Value = "12345678-1234-1234-1234-123456789012" },
            To = new DelegationParty { Type = DelegationConst.Party, Value = "87654321-4321-4321-4321-210987654321" },
            ResourceId = "testapp",
            InstanceId = "instanceOwner/12345678-1234-1234-1234-123456789012",
            Rights =
            [
                new()
                {
                    Resource = [], // Empty resource list
                    Action = new AltinnAction { Type = DelegationConst.ActionId, Value = ActionType.Read },
                },
            ],
        };

        // Act
        var result = DelegationRequest.ConvertToDto(delegationRequest);

        // Assert
        Assert.NotNull(result);
        Assert.Single(result.Rights);

        var rightDto = result.Rights.First();
        Assert.Empty(rightDto.Resource);
        Assert.Equal(DelegationConst.ActionId, rightDto.Action.Type);
        Assert.Equal(ActionType.Read, rightDto.Action.Value);
    }
}

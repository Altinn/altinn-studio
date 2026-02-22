using WorkflowEngine.Data.Entities;
using WorkflowEngine.Models;

namespace WorkflowEngine.Data.Tests.Entities;

public class ReplyEntityTests
{
    [Fact]
    public void ToDomainModel_FromDomainModel_RoundTrip_PreservesAllFields()
    {
        // Arrange
        var entity = new ReplyEntity
        {
            Id = 42,
            ReplyId = Guid.Parse("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"),
            StepId = 99,
            Payload = """{"response":"data"}""",
            CreatedAt = new DateTimeOffset(2025, 6, 15, 10, 30, 0, TimeSpan.Zero),
        };

        // Act
        var domain = entity.ToDomainModel();
        var roundTripped = ReplyEntity.FromDomainModel(domain);

        // Assert
        Assert.Equal(entity.Id, roundTripped.Id);
        Assert.Equal(entity.ReplyId, roundTripped.ReplyId);
        Assert.Equal(entity.StepId, roundTripped.StepId);
        Assert.Equal(entity.Payload, roundTripped.Payload);
        Assert.Equal(entity.CreatedAt, roundTripped.CreatedAt);
    }

    [Fact]
    public void ToDomainModel_MapsFieldsCorrectly()
    {
        // Arrange
        var replyId = Guid.NewGuid();
        var entity = new ReplyEntity
        {
            Id = 10,
            ReplyId = replyId,
            StepId = 55,
            Payload = """{"key":"value"}""",
            CreatedAt = new DateTimeOffset(2025, 1, 1, 0, 0, 0, TimeSpan.Zero),
        };

        // Act
        var domain = entity.ToDomainModel();

        // Assert
        Assert.Equal(10, domain.DatabaseId);
        Assert.Equal(replyId, domain.ReplyId);
        Assert.Equal(55, domain.StepId);
        Assert.Equal("""{"key":"value"}""", domain.Payload);
        Assert.Equal(new DateTimeOffset(2025, 1, 1, 0, 0, 0, TimeSpan.Zero), domain.CreatedAt);
    }

    [Fact]
    public void FromDomainModel_MapsFieldsCorrectly()
    {
        // Arrange
        var replyId = Guid.NewGuid();
        var reply = new Reply
        {
            DatabaseId = 10,
            ReplyId = replyId,
            StepId = 55,
            Payload = """{"key":"value"}""",
            CreatedAt = new DateTimeOffset(2025, 1, 1, 0, 0, 0, TimeSpan.Zero),
        };

        // Act
        var entity = ReplyEntity.FromDomainModel(reply);

        // Assert
        Assert.Equal(10, entity.Id);
        Assert.Equal(replyId, entity.ReplyId);
        Assert.Equal(55, entity.StepId);
        Assert.Equal("""{"key":"value"}""", entity.Payload);
        Assert.Equal(new DateTimeOffset(2025, 1, 1, 0, 0, 0, TimeSpan.Zero), entity.CreatedAt);
    }
}

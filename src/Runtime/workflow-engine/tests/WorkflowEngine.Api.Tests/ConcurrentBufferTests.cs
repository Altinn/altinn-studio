namespace WorkflowEngine.Api.Tests;

public class ConcurrentBufferTests
{
    [Fact]
    public async Task Latest_EmptyBuffer_ReturnsNull()
    {
        // Arrange
        using var buffer = new ConcurrentBuffer<int>();

        // Act
        var result = await buffer.Latest();

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public async Task Latest_AfterAdd_ReturnsMostRecentValue()
    {
        // Arrange
        using var buffer = new ConcurrentBuffer<int>();
        await buffer.Add(1);
        await buffer.Add(2);
        await buffer.Add(3);

        // Act
        var result = await buffer.Latest();

        // Assert
        Assert.Equal(3, result);
    }

    [Fact]
    public async Task Previous_EmptyBuffer_ReturnsNull()
    {
        // Arrange
        using var buffer = new ConcurrentBuffer<int>();

        // Act
        var result = await buffer.Previous();

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public async Task Previous_SingleItem_ReturnsNull()
    {
        // Arrange
        using var buffer = new ConcurrentBuffer<int>();
        await buffer.Add(1);

        // Act
        var result = await buffer.Previous();

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public async Task Previous_MultipleItems_ReturnsSecondToLast()
    {
        // Arrange
        using var buffer = new ConcurrentBuffer<int>();
        await buffer.Add(10);
        await buffer.Add(20);
        await buffer.Add(30);

        // Act
        var result = await buffer.Previous();

        // Assert
        Assert.Equal(20, result);
    }

    [Fact]
    public async Task Add_ExceedsMaxSize_EvictsOldestItems()
    {
        // Arrange
        using var buffer = new ConcurrentBuffer<int>(maxSize: 3);
        await buffer.Add(1);
        await buffer.Add(2);
        await buffer.Add(3);

        // Act — add a 4th item, which should evict item 1
        await buffer.Add(4);

        // Assert
        var latest = await buffer.Latest();
        var previous = await buffer.Previous();
        Assert.Equal(4, latest);
        Assert.Equal(3, previous);
    }

    [Fact]
    public async Task Clear_RemovesAllItems()
    {
        // Arrange
        using var buffer = new ConcurrentBuffer<int>();
        await buffer.Add(1);
        await buffer.Add(2);

        // Act
        await buffer.Clear();

        // Assert
        Assert.Null(await buffer.Latest());
        Assert.Null(await buffer.Previous());
    }

    [Fact]
    public async Task ConsecutiveCount_EmptyBuffer_ReturnsZero()
    {
        // Arrange
        using var buffer = new ConcurrentBuffer<int>();

        // Act
        var count = await buffer.ConsecutiveCount(v => v > 0);

        // Assert
        Assert.Equal(0, count);
    }

    [Fact]
    public async Task ConsecutiveCount_AllMatch_ReturnsTotalCount()
    {
        // Arrange
        using var buffer = new ConcurrentBuffer<int>();
        await buffer.Add(5);
        await buffer.Add(10);
        await buffer.Add(15);

        // Act
        var count = await buffer.ConsecutiveCount(v => v > 0);

        // Assert
        Assert.Equal(3, count);
    }

    [Fact]
    public async Task ConsecutiveCount_PartialMatch_CountsFromEnd()
    {
        // Arrange
        using var buffer = new ConcurrentBuffer<int>();
        await buffer.Add(1);
        await buffer.Add(-1); // breaks the streak
        await buffer.Add(2);
        await buffer.Add(3);

        // Act — only the trailing 2, 3 match
        var count = await buffer.ConsecutiveCount(v => v > 0);

        // Assert
        Assert.Equal(2, count);
    }

    [Fact]
    public async Task ConsecutiveCount_NoneMatch_ReturnsZero()
    {
        // Arrange
        using var buffer = new ConcurrentBuffer<int>();
        await buffer.Add(1);
        await buffer.Add(2);
        await buffer.Add(3);

        // Act
        var count = await buffer.ConsecutiveCount(v => v > 100);

        // Assert
        Assert.Equal(0, count);
    }
}

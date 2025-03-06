using System.IO;
using Xunit;

namespace Designer.Tests.Services;

public class TempTests
{
    [Fact]
    public void FirstTest()
    {
        Assert.Equal('/', Path.DirectorySeparatorChar);
    }
}

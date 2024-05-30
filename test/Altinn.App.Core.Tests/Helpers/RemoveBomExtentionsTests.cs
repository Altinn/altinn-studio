#nullable disable
using Altinn.App.Core.Helpers;
using FluentAssertions;

namespace Altinn.App.Core.Tests.Helpers;

public class RemoveBomExtentionsTests
{
    [Fact]
    public void TestRemoveBom()
    {
        var withBom = new byte[] { 0xEF, 0xBB, 0xBF, 0x23 };

        withBom.RemoveBom().ToArray().Should().HaveCount(withBom.Length - 3);
    }

    [Fact]
    public void TestNotRemoveBom()
    {
        var withBom = new byte[] { 0xEF, 0xBB, 0xee, 0xBF, 0x23 };

        withBom.RemoveBom().ToArray().Should().HaveCount(withBom.Length);
    }
}

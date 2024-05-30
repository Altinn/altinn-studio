using Altinn.App.Core.Models.Result;
using FluentAssertions;

namespace Altinn.App.Core.Tests.Models.Result;

public class ServiceResultTests
{
    [Fact]
    public void Ok_result()
    {
        var value = "value";
        ServiceResult<string, DummyError> res = value;
        res.Success.Should().BeTrue();
        res.Ok.Should().Be(value);
        res.Error.Should().BeNull();
    }

    [Fact]
    public void Ok_result_handles_null()
    {
        string? value = null;
        ServiceResult<string?, DummyError> res = value;
        res.Success.Should().BeTrue();
        res.Ok.Should().BeNull();
        res.Error.Should().BeNull();
    }

    [Fact]
    public void Error_result()
    {
        var dummyError = new DummyError();
        ServiceResult<string, DummyError> res = dummyError;
        res.Success.Should().BeFalse();
        res.Error.Should().Be(dummyError);
        res.Ok.Should().BeNull();
    }

    private class DummyError;
}

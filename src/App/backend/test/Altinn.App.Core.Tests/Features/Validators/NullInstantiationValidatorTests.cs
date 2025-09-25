#nullable disable
using Altinn.App.Core.Features.Validation;
using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;

namespace Altinn.App.PlatformServices.Tests.Features.Validators;

public class NullInstantiationValidatorTests
{
    [Fact]
    public async Task NullInstantiationTest_Validation_returns_null()
    {
        // Arrange
        var nullInstantiation = new NullInstantiationValidator();

        // Act
        var result = await nullInstantiation.Validate(new Instance());

        // Assert
        result.Should().BeNull();
    }
}

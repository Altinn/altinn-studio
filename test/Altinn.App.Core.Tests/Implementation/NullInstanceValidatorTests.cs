using Altinn.App.Core.Features.Validation;
using Altinn.App.PlatformServices.Tests.Implementation.TestResources;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Xunit;

namespace Altinn.App.PlatformServices.Tests.Implementation;

public class NullInstanceValidatorTests
{
    [Fact]
    public async void NullInstanceValidator_ValidateData_does_not_add_to_ValidationResults()
    {
        // Arrange
        var instanceValidator = new NullInstanceValidator();
        ModelStateDictionary validationResults = new ModelStateDictionary();
        
        // Act
        await instanceValidator.ValidateData(new DummyModel(), validationResults);
        
        // Assert
        Assert.Empty(validationResults);
    }
    
    [Fact]
    public async void NullInstanceValidator_ValidateTask_does_not_add_to_ValidationResults()
    {
        // Arrange
        var instanceValidator = new NullInstanceValidator();
        ModelStateDictionary validationResults = new ModelStateDictionary();
        
        // Act
        await instanceValidator.ValidateTask(new Instance(), "task0", validationResults);
        
        // Assert
        Assert.Empty(validationResults);
    }
}
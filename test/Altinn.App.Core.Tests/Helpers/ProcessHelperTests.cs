using System.Collections.Generic;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;
using Xunit;

namespace Altinn.App.PlatformServices.Tests.Helpers;

public class ProcessHelperTests
{
    [Fact]
    public void CanEndProcessTask_returns_true_when_task_is_validated_even_with_validationIssues()
    {
        // Arrange
        var instance = new Instance()
        {
            Process = new ProcessState()
            {
                CurrentTask = new ProcessElementInfo()
                {
                    Validated = new ValidationStatus()
                    {
                        CanCompleteTask = true
                    }
                }
            }
        };
        var validationIssues = new List<ValidationIssue>()
        {
            new ValidationIssue()
            {
                Severity = ValidationIssueSeverity.Error
            }
        };
        
        // Act and Assert
        ProcessHelper.CanEndProcessTask("taskid", instance, validationIssues).Result.Should().BeTrue();
    }
    
    [Fact]
    public void CanEndProcessTask_returns_true_when_no_validationIssues()
    {
        // Arrange
        var instance = new Instance();
        var validationIssues = new List<ValidationIssue>();
        
        // Act and Assert
        ProcessHelper.CanEndProcessTask("taskid", instance, validationIssues).Result.Should().BeTrue();
    }
    
    [Fact]
    public void CanEndProcessTask_returns_false_when_task_is_validated_false_even_with_no_validationIssues()
    {
        // Arrange
        var instance = new Instance()
        {
            Process = new ProcessState()
            {
                CurrentTask = new ProcessElementInfo()
                {
                    Validated = new ValidationStatus()
                    {
                        CanCompleteTask = false
                    }
                }
            }
        };
        var validationIssues = new List<ValidationIssue>();
        
        // Act and Assert
        ProcessHelper.CanEndProcessTask("taskid", instance, validationIssues).Result.Should().BeFalse();
    }
    
    [Fact]
    public void CanEndProcessTask_returns_false_when_task_is_not_validated_with_validationIssues()
    {
        // Arrange
        var instance = new Instance();
        var validationIssues = new List<ValidationIssue>()
        {
            new ValidationIssue()
            {
                Severity = ValidationIssueSeverity.Error
            }
        };
        
        // Act and Assert
        ProcessHelper.CanEndProcessTask("taskid", instance, validationIssues).Result.Should().BeFalse();
    }
}
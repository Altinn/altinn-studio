using System.Text.Json;
using System.Text.Json.Nodes;
using Altinn.Studio.Cli.Upgrade.Next.RuleConfiguration.Models;

namespace Altinn.Studio.Cli.Upgrade.Next.RuleConfiguration.ConditionalRenderingRules;

/// <summary>
/// Injects hidden expressions into layout components
/// </summary>
internal class ComponentHiddenExpressionInjector
{
    private readonly LayoutFileManager _layoutManager;

    public ComponentHiddenExpressionInjector(LayoutFileManager layoutManager)
    {
        _layoutManager = layoutManager;
    }

    /// <summary>
    /// Inject a hidden expression into a component
    /// </summary>
    public InjectionResult InjectHiddenExpression(
        string componentId,
        ConversionResult conversionResult,
        string ruleId,
        string? jsFunctionBody = null,
        string? ruleConfigJson = null
    )
    {
        // Find the component
        var componentLocation = _layoutManager.FindComponentById(componentId);
        if (componentLocation == null)
        {
            return new InjectionResult
            {
                Success = false,
                ComponentId = componentId,
                Status = InjectionStatus.ComponentNotFound,
                Message = $"Component '{componentId}' not found in any layout file",
            };
        }

        var (layoutFile, component) = componentLocation.Value;

        // Check for existing hidden property
        bool hasExistingHidden = _layoutManager.HasProperty(component, "hidden");
        JsonNode? existingHiddenExpression = null;
        if (hasExistingHidden)
        {
            existingHiddenExpression = component["hidden"]?.DeepClone();
        }

        // Handle conversion failure
        if (conversionResult.Status == ConversionStatus.Failed)
        {
            // Store the rule config and JS function in a comment property for developer reference
            var commentInfo = "";
            if (!string.IsNullOrEmpty(ruleConfigJson))
            {
                commentInfo += $"Rule config: {ruleConfigJson}";
            }
            if (!string.IsNullOrEmpty(jsFunctionBody))
            {
                if (!string.IsNullOrEmpty(commentInfo))
                {
                    commentInfo += " | ";
                }
                commentInfo += $"Original JS function: {jsFunctionBody}";
            }

            component["_conversionFailureInfo"] = commentInfo;

            // Inject placeholder that will be replaced with invalid JSON
            var placeholderNode = JsonNode.Parse($"\"__MANUAL_CONVERSION_REQUIRED_{ruleId}__\"");

            // If there's an existing hidden expression, combine with 'or'
            JsonNode finalExpression;
            if (existingHiddenExpression != null)
            {
                finalExpression = JsonSerializer.SerializeToNode(
                    new object[] { "or", existingHiddenExpression, placeholderNode }
                )!;
            }
            else
            {
                finalExpression = placeholderNode;
            }

            _layoutManager.UpdateComponentProperty(component, "hidden", finalExpression);

            return new InjectionResult
            {
                Success = true, // We still injected something (placeholder)
                ComponentId = componentId,
                LayoutFile = layoutFile,
                Status = InjectionStatus.ConversionFailed,
                Message = $"Conversion failed for component '{componentId}': {conversionResult.FailureReason}",
                RuleId = ruleId,
                JsFunctionBody = jsFunctionBody,
            };
        }

        // Inject the successfully converted expression
        var expressionNode = JsonSerializer.SerializeToNode(conversionResult.Expression);

        // If there's an existing hidden expression, combine with 'or'
        JsonNode finalHiddenExpression;
        if (existingHiddenExpression != null)
        {
            finalHiddenExpression = JsonSerializer.SerializeToNode(
                new object[] { "or", existingHiddenExpression, expressionNode }
            )!;
        }
        else
        {
            finalHiddenExpression = expressionNode!;
        }

        _layoutManager.UpdateComponentProperty(component, "hidden", finalHiddenExpression);

        var status = hasExistingHidden ? InjectionStatus.ExistingHiddenConflict : InjectionStatus.Success;
        return new InjectionResult
        {
            Success = true,
            ComponentId = componentId,
            LayoutFile = layoutFile,
            Status = status,
            Message = hasExistingHidden
                ? $"Component '{componentId}' already had 'hidden' property, combined with 'or' expression"
                : $"Successfully injected hidden expression into component '{componentId}'",
        };
    }
}

/// <summary>
/// Result of injecting a hidden expression
/// </summary>
internal class InjectionResult
{
    public bool Success { get; set; }
    public string ComponentId { get; set; } = string.Empty;
    public string? LayoutFile { get; set; }
    public InjectionStatus Status { get; set; }
    public string Message { get; set; } = string.Empty;
    public string? RuleId { get; set; }
    public string? JsFunctionBody { get; set; }
}

/// <summary>
/// Status of the injection operation
/// </summary>
internal enum InjectionStatus
{
    Success,
    ComponentNotFound,
    ExistingHiddenConflict,
    ConversionFailed,
}

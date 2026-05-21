using Altinn.Augmenter.Agent.Pipelines.Generic;
using Microsoft.Extensions.Options;

namespace Altinn.Augmenter.Agent.Configuration;

/// <summary>
/// Validates the mounted config folder at startup so configuration errors surface
/// once at boot — not on the first <c>/generate</c> request, possibly hours later.
/// The failure message is the contract: a tenant repo that satisfies every check
/// in <see cref="Validate"/> is a valid augmenter-agent config.
/// </summary>
public static class ConfigValidator
{
    private const string SystemPromptFileName = "system-prompt.md";
    private const string DefaultSchemaFileName = "sjekkliste.json";

    public static void Validate(IServiceProvider services)
    {
        var paths = services.GetRequiredService<IOptions<ContentPathsOptions>>().Value;
        var loader = services.GetRequiredService<PipelineLoader>();
        var logger = services.GetRequiredService<ILogger<Program>>();

        var errors = new List<string>();

        if (!Directory.Exists(paths.TemplatesRoot))
            errors.Add($"TemplatesRoot does not exist: {paths.TemplatesRoot}");
        if (!Directory.Exists(paths.MappingsRoot))
            errors.Add($"MappingsRoot does not exist: {paths.MappingsRoot}");

        PipelineDefinition? pipeline = null;
        try
        {
            pipeline = loader.Load();
        }
        catch (Exception ex)
        {
            errors.Add($"Failed to load pipeline.yaml: {ex.Message}");
        }

        if (pipeline != null)
            ValidatePipeline(pipeline, paths, errors);

        if (errors.Count > 0)
        {
            var formatted = FormatErrors(errors, paths);
            logger.LogCritical("{Message}", formatted);
            throw new InvalidOperationException(formatted);
        }

        logger.LogInformation(
            "Config validated: {StepCount} step(s) from {TemplatesRoot}, {MappingsRoot}, {RegistriesRoot}",
            pipeline!.Steps.Count, paths.TemplatesRoot, paths.MappingsRoot, paths.RegistriesRoot);
    }

    private static void ValidatePipeline(PipelineDefinition pipeline, ContentPathsOptions paths, List<string> errors)
    {
        if (pipeline.Steps.Count == 0)
        {
            errors.Add("pipeline.yaml has no 'steps' — at least one step is required.");
            return;
        }

        var hasOrchestratedStep = pipeline.Steps.Any(s => s.Type == "agent-pdf-orchestrated");

        if (hasOrchestratedStep)
        {
            if (!Directory.Exists(paths.RulesRoot))
                errors.Add($"RulesRoot does not exist (required by agent-pdf-orchestrated steps): {paths.RulesRoot}");
            if (!Directory.Exists(paths.OrchestratorRoot))
                errors.Add($"OrchestratorRoot does not exist (required by agent-pdf-orchestrated steps): {paths.OrchestratorRoot}");
            else if (!File.Exists(Path.Combine(paths.OrchestratorRoot, SystemPromptFileName)))
                errors.Add($"{SystemPromptFileName} not found under OrchestratorRoot: {paths.OrchestratorRoot}");
            if (!Directory.Exists(paths.ToolsRoot))
                errors.Add($"ToolsRoot does not exist (required by agent-pdf-orchestrated steps): {paths.ToolsRoot}");
        }

        if (hasOrchestratedStep && !Directory.Exists(paths.RegistriesRoot))
            errors.Add($"RegistriesRoot does not exist (required by agent-pdf-orchestrated output schema): {paths.RegistriesRoot}");

        foreach (var step in pipeline.Steps)
            ValidateStep(step, paths, errors);
    }

    private static void ValidateStep(StepDefinition step, ContentPathsOptions paths, List<string> errors)
    {
        var prefix = $"Step '{step.Name}' ({step.Type})";

        if (string.IsNullOrWhiteSpace(step.Name))
            errors.Add("A step is missing 'name'.");
        if (string.IsNullOrWhiteSpace(step.Type))
            errors.Add($"{prefix}: missing 'type'.");
        if (string.IsNullOrWhiteSpace(step.Mapper))
            errors.Add($"{prefix}: missing 'mapper'.");
        if (string.IsNullOrWhiteSpace(step.Template))
            errors.Add($"{prefix}: missing 'template'.");
        if (string.IsNullOrWhiteSpace(step.Output))
            errors.Add($"{prefix}: missing 'output'.");

        if (step.Type is not ("mapping-pdf" or "agent-pdf-orchestrated"))
        {
            errors.Add($"{prefix}: unknown step type. Supported: mapping-pdf, agent-pdf-orchestrated.");
            return;
        }

        if (!string.IsNullOrWhiteSpace(step.Mapper) && Directory.Exists(paths.MappingsRoot))
        {
            var mapperSpec = Path.Combine(paths.MappingsRoot, step.Mapper + ".json");
            if (!File.Exists(mapperSpec))
                errors.Add($"{prefix}: references mapper '{step.Mapper}' but {mapperSpec} does not exist.");
        }

        if (!string.IsNullOrWhiteSpace(step.Template) && Directory.Exists(paths.TemplatesRoot))
        {
            var templatePath = Path.Combine(paths.TemplatesRoot, step.Template);
            if (!File.Exists(templatePath))
                errors.Add($"{prefix}: references template '{step.Template}' but {templatePath} does not exist.");
        }

        if (!string.IsNullOrWhiteSpace(step.DocxTemplate) && Directory.Exists(paths.TemplatesRoot))
        {
            var docxPath = Path.Combine(paths.TemplatesRoot, step.DocxTemplate);
            if (!File.Exists(docxPath))
                errors.Add($"{prefix}: references docxTemplate '{step.DocxTemplate}' but {docxPath} does not exist.");
        }

        if (step.Type == "agent-pdf-orchestrated")
            ValidateOrchestratedStep(step, paths, errors, prefix);
    }

    private static void ValidateOrchestratedStep(
        StepDefinition step, ContentPathsOptions paths, List<string> errors, string prefix)
    {
        var rulesSubfolder = string.IsNullOrEmpty(step.RulesFolder) || step.RulesFolder == "."
            ? string.Empty
            : step.RulesFolder;
        var rulesPath = string.IsNullOrEmpty(rulesSubfolder)
            ? paths.RulesRoot
            : Path.Combine(paths.RulesRoot, rulesSubfolder);

        if (Directory.Exists(paths.RulesRoot) && !Directory.Exists(rulesPath))
            errors.Add($"{prefix}: references rulesFolder '{step.RulesFolder}' but {rulesPath} does not exist.");

        var schemaFileName = step.SchemaFile ?? DefaultSchemaFileName;
        if (Directory.Exists(paths.RegistriesRoot))
        {
            var schemaPath = Path.Combine(paths.RegistriesRoot, schemaFileName);
            if (!File.Exists(schemaPath))
                errors.Add($"{prefix}: schema file '{schemaFileName}' not found at {schemaPath}.");
        }
    }

    private static string FormatErrors(List<string> errors, ContentPathsOptions paths)
    {
        var lines = new List<string>
        {
            $"Config validation failed ({errors.Count} error(s)). The mounted config folder does not satisfy the augmenter-agent contract.",
            "",
            "Current resolved paths:",
            $"  TemplatesRoot:    {paths.TemplatesRoot}",
            $"  MappingsRoot:     {paths.MappingsRoot}",
            $"  RegistriesRoot:   {paths.RegistriesRoot}",
            $"  RulesRoot:        {paths.RulesRoot}",
            $"  OrchestratorRoot: {paths.OrchestratorRoot}",
            $"  ToolsRoot:        {paths.ToolsRoot}",
            "",
            "Errors:",
        };
        lines.AddRange(errors.Select(e => "  - " + e));
        lines.Add("");
        lines.Add("See config/README.md in the augmenter-agent repository for the full contract.");
        return string.Join(Environment.NewLine, lines);
    }
}

namespace Altinn.App.Ai.Enrichment.Agents;

/// <summary>
/// Validates an agent folder against its agent.yaml so configuration errors
/// surface when the agent is loaded (app startup / first task execution) — with
/// one message listing every problem. The failure message is the contract: an
/// agent folder that satisfies every check in <see cref="Validate"/> is valid.
/// </summary>
public static class AgentValidator
{
    private const string DefaultSchemaFileName = "sjekkliste.json";

    public static void Validate(AgentFolder folder, AgentDefinition definition)
    {
        var errors = new List<string>();

        if (definition.Steps.Count == 0)
            errors.Add("agent.yaml has no 'steps' — at least one step is required.");

        var hasOrchestratedStep = definition.Steps.Any(s => s.Type == "agent-pdf-orchestrated");
        if (hasOrchestratedStep)
        {
            if (!File.Exists(folder.SystemPromptPath))
                errors.Add($"system-prompt.md not found at {folder.SystemPromptPath} (required by agent-pdf-orchestrated steps).");
            if (!Directory.Exists(folder.RulesDirectory))
                errors.Add($"rules/ folder does not exist (required by agent-pdf-orchestrated steps): {folder.RulesDirectory}");
            if (!Directory.Exists(folder.ToolsDirectory))
                errors.Add($"tools/ folder does not exist (required by agent-pdf-orchestrated steps): {folder.ToolsDirectory}");
            if (!Directory.Exists(folder.RegistriesDirectory))
                errors.Add($"registries/ folder does not exist (required by the agent-pdf-orchestrated output schema): {folder.RegistriesDirectory}");
        }

        if (definition.Steps.Any(s => s.Mapper.Length > 0) && !Directory.Exists(folder.MappingsDirectory))
            errors.Add($"mappings/ folder does not exist: {folder.MappingsDirectory}");
        if (definition.Steps.Any(s => !string.IsNullOrEmpty(s.Template)) && !Directory.Exists(folder.TemplatesDirectory))
            errors.Add($"templates/ folder does not exist: {folder.TemplatesDirectory}");

        foreach (var step in definition.Steps)
            ValidateStep(step, folder, errors);

        if (errors.Count > 0)
            throw new InvalidOperationException(FormatErrors(folder, errors));
    }

    private static void ValidateStep(StepDefinition step, AgentFolder folder, List<string> errors)
    {
        var prefix = $"Step '{step.Name}' ({step.Type})";

        if (string.IsNullOrWhiteSpace(step.Name))
            errors.Add("A step is missing 'name'.");
        if (string.IsNullOrWhiteSpace(step.Type))
            errors.Add($"{prefix}: missing 'type'.");
        if (string.IsNullOrWhiteSpace(step.Mapper))
            errors.Add($"{prefix}: missing 'mapper'.");

        if (step.Type is not ("mapping-pdf" or "agent-pdf-orchestrated"))
        {
            errors.Add($"{prefix}: unknown step type. Supported: mapping-pdf, agent-pdf-orchestrated.");
            return;
        }

        if (step.Type == "mapping-pdf" && string.IsNullOrWhiteSpace(step.Template))
            errors.Add($"{prefix}: missing 'template'.");
        if (!string.IsNullOrWhiteSpace(step.Template) && string.IsNullOrWhiteSpace(step.Output))
            errors.Add($"{prefix}: missing 'output' (required when 'template' is set).");

        if (!string.IsNullOrWhiteSpace(step.Mapper) && Directory.Exists(folder.MappingsDirectory))
        {
            var mapperSpec = Path.Combine(folder.MappingsDirectory, step.Mapper + ".json");
            if (!File.Exists(mapperSpec))
                errors.Add($"{prefix}: references mapper '{step.Mapper}' but {mapperSpec} does not exist.");
        }

        if (!string.IsNullOrWhiteSpace(step.Template) && Directory.Exists(folder.TemplatesDirectory))
        {
            var templatePath = Path.Combine(folder.TemplatesDirectory, step.Template);
            if (!File.Exists(templatePath))
                errors.Add($"{prefix}: references template '{step.Template}' but {templatePath} does not exist.");
        }

        if (step.Type == "agent-pdf-orchestrated")
            ValidateOrchestratedStep(step, folder, errors, prefix);
    }

    private static void ValidateOrchestratedStep(
        StepDefinition step, AgentFolder folder, List<string> errors, string prefix)
    {
        var rulesSubfolder = string.IsNullOrEmpty(step.RulesFolder) || step.RulesFolder == "."
            ? string.Empty
            : step.RulesFolder;
        var rulesPath = string.IsNullOrEmpty(rulesSubfolder)
            ? folder.RulesDirectory
            : Path.Combine(folder.RulesDirectory, rulesSubfolder);

        if (Directory.Exists(folder.RulesDirectory) && !Directory.Exists(rulesPath))
            errors.Add($"{prefix}: references rulesFolder '{step.RulesFolder}' but {rulesPath} does not exist.");

        var schemaFileName = step.SchemaFile ?? DefaultSchemaFileName;
        if (Directory.Exists(folder.RegistriesDirectory))
        {
            var schemaPath = Path.Combine(folder.RegistriesDirectory, schemaFileName);
            if (!File.Exists(schemaPath))
                errors.Add($"{prefix}: schema file '{schemaFileName}' not found at {schemaPath}.");
        }
    }

    private static string FormatErrors(AgentFolder folder, List<string> errors)
    {
        var lines = new List<string>
        {
            $"Agent '{folder.Name}' failed validation ({errors.Count} error(s)). The agent folder does not satisfy the enrichment contract.",
            "",
            $"Agent folder: {folder.Root}",
            "Expected layout: agent.yaml, system-prompt.md, rules/, tools/, registries/, mappings/, templates/",
            "",
            "Errors:",
        };
        lines.AddRange(errors.Select(e => "  - " + e));
        return string.Join(Environment.NewLine, lines);
    }
}

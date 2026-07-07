namespace Altinn.Studio.Cli.Upgrade.v8Tov9.EFormidlingServiceTaskMigration;

/// <summary>
/// Coordinates the migration away from the deprecated <c>eFormidling</c> block in
/// applicationmetadata.json: adds an <c>eFormidling</c> service task to the process after the task
/// the legacy <c>sendAfterTaskId</c> pointed at, expresses the legacy
/// <c>AppSettings:EnableEFormidling</c> gate as <c>&lt;altinn:disabled&gt;</c> configuration, then
/// strips the legacy block and setting. See <see cref="ApplicationMetadataEFormidlingRewriter"/> for
/// the legacy semantics.
/// </summary>
internal sealed class EFormidlingServiceTaskMigrator
{
    private readonly string _projectFolder;

    public EFormidlingServiceTaskMigrator(string projectFolder)
    {
        _projectFolder = projectFolder;
    }

    /// <summary>
    /// Runs the migration. Returns the collected warnings; an empty list means a clean migration (or
    /// nothing to migrate). Throws if a required file is malformed in a way we cannot recover from.
    /// </summary>
    public async Task<IReadOnlyList<string>> Migrate()
    {
        var warnings = new List<string>();

        var metadataFile = AppFiles.Resolve(_projectFolder, "config/applicationmetadata.json");
        if (metadataFile is null)
        {
            warnings.Add("Could not find config/applicationmetadata.json; skipped eFormidling migration.");
            return warnings;
        }

        var metadataRewriter = new ApplicationMetadataEFormidlingRewriter(metadataFile);
        var config = metadataRewriter.ReadLegacyConfiguration();
        if (config is null)
        {
            // No eFormidling block at all - nothing to migrate.
            return warnings;
        }

        if (config.IsEmpty)
        {
            // An empty (or null) block never configured anything; removing it clears the analyzer
            // error without adding a service task.
            await metadataRewriter.StripEFormidlingBlock();
            warnings.AddRange(metadataRewriter.GetWarnings());
            warnings.Add(
                "Removed an empty legacy eFormidling block from applicationmetadata.json; no eFormidling "
                    + "service task was added."
            );
            return warnings;
        }

        var reportedMetadataWarnings = metadataRewriter.GetWarnings().Count;
        warnings.AddRange(metadataRewriter.GetWarnings());

        if (string.IsNullOrWhiteSpace(config.SendAfterTaskId))
        {
            // Without a sendAfterTaskId the legacy backend never sent a shipment, but the block
            // still holds configuration the developer may want to keep. Leave everything in place
            // (the analyzer error keeps pointing at it) so nothing is lost silently.
            warnings.Add(
                "The legacy eFormidling configuration has no sendAfterTaskId, so there is no task to attach "
                    + "the eFormidling service task to (the legacy backend never sent a shipment for this "
                    + "configuration). Left applicationmetadata.json unchanged - add an 'eFormidling' service "
                    + "task manually or remove the eFormidling block."
            );
            return warnings;
        }

        var processFile = AppFiles.Resolve(_projectFolder, "config/process/process.bpmn");
        if (processFile is null)
        {
            warnings.Add(
                "applicationmetadata.json configures legacy eFormidling, but config/process/process.bpmn "
                    + "was not found; cannot add the eFormidling service task. Left applicationmetadata.json "
                    + "unchanged."
            );
            return warnings;
        }

        // applicationmetadata.json lives in {appFolder}/config/, and the appsettings files in {appFolder}.
        var configFolder = Path.GetDirectoryName(metadataFile);
        var appFolder = (configFolder is null ? null : Path.GetDirectoryName(configFolder)) ?? _projectFolder;
        var settingsRewriter = new AppSettingsEFormidlingRewriter(appFolder);
        var gate = settingsRewriter.ReadGate();

        var processRewriter = new EFormidlingProcessRewriter(processFile);
        var result = processRewriter.InsertEFormidlingServiceTask(
            config.SendAfterTaskId,
            metadataRewriter.GetFormDataTypeForTask(config.SendAfterTaskId),
            config,
            gate
        );
        warnings.AddRange(processRewriter.GetWarnings());

        if (result == EFormidlingInsertResult.Skipped)
        {
            // Keep the legacy block (and the appsettings gate): stripping it now would leave the app
            // with neither the v8 configuration nor the v9 service task, silently dropping the
            // shipment - and the analyzer error is what tells the developer the migration needs
            // manual work.
            warnings.Add(
                "Left the eFormidling block in applicationmetadata.json unchanged because the eFormidling "
                    + "service task could not be inserted automatically. Add the service task manually (or fix "
                    + "the process) and re-run the upgrade to strip the block."
            );
            return warnings;
        }

        if (result == EFormidlingInsertResult.Inserted)
        {
            await processRewriter.Write();

            if (!gate.EnabledAnywhere)
            {
                warnings.Add(
                    "AppSettings:EnableEFormidling was not enabled in any appsettings file, so the legacy "
                        + "configuration never sent a shipment. The migrated service task carries the "
                        + "configuration but is <altinn:disabled> - remove the disabled element in process.bpmn "
                        + "to activate it."
                );
            }
            else if (!gate.EnabledEverywhere)
            {
                warnings.Add(
                    "AppSettings:EnableEFormidling differed per environment. The migrated service task mirrors "
                        + $"that with <altinn:disabled env=\"...\"> element(s) for "
                        + $"[{string.Join(", ", gate.DisabledEnvironments())}] - review them in process.bpmn."
                );
            }
        }

        // Strip the legacy configuration last, so a failure above leaves it untouched.
        await metadataRewriter.StripEFormidlingBlock();
        await settingsRewriter.StripEnableEFormidling();
        warnings.AddRange(metadataRewriter.GetWarnings().Skip(reportedMetadataWarnings));
        warnings.AddRange(settingsRewriter.GetWarnings());

        if (config.ServiceId is not null)
        {
            warnings.Add(
                $"The legacy eFormidling serviceId ('{config.ServiceId}') has no equivalent in the v9 service "
                    + "task configuration and was dropped - the eFormidling integration point resolves the "
                    + "service from the receiver's capabilities."
            );
        }

        if (gate.EnabledAnywhere && !AppRegistersEFormidlingServices(appFolder))
        {
            warnings.Add(
                "Could not find an AddEFormidlingServices registration in the app's C# code. The v9 "
                    + "eFormidling service task fails at runtime without it - make sure Program.cs registers "
                    + "the services with AddEFormidlingServices2<TM, TR> (and implements IEFormidlingMetadata)."
            );
        }

        return warnings;
    }

    /// <summary>
    /// Best-effort check that the app registers the eFormidling services somewhere in its C# code.
    /// The legacy backend only logged an error when they were missing; the v9 service task fails the
    /// process step, so a heads-up during the upgrade saves a runtime surprise.
    /// </summary>
    private static bool AppRegistersEFormidlingServices(string appFolder)
    {
        try
        {
            foreach (var file in Directory.EnumerateFiles(appFolder, "*.cs", SearchOption.AllDirectories))
            {
                var relative = Path.GetRelativePath(appFolder, file);
                if (
                    relative.StartsWith("bin", StringComparison.OrdinalIgnoreCase)
                    || relative.StartsWith("obj", StringComparison.OrdinalIgnoreCase)
                )
                {
                    continue;
                }

                if (File.ReadAllText(file).Contains("AddEFormidlingServices", StringComparison.Ordinal))
                    return true;
            }
        }
        catch (IOException)
        {
            // If the scan fails we simply skip the warning; it is advisory only.
            return true;
        }

        return false;
    }
}

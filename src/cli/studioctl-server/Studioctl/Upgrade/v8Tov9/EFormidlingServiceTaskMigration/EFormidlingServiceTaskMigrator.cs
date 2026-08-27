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
    /// Runs the migration. The result carries any warnings, plus a to-do when manual follow-up is
    /// required (e.g. a task that could not be migrated left the legacy block in place). No warnings and
    /// no to-dos means a clean migration (or nothing to migrate). Throws if a required file is
    /// malformed in a way we cannot recover from.
    /// </summary>
    public async Task<MigrationResult> Migrate()
    {
        var messages = new List<UpgradeMessage>();

        var metadataFile = AppFiles.Resolve(_projectFolder, "config/applicationmetadata.json");
        if (metadataFile is null)
        {
            // Nothing to migrate and no block left behind, so no manual follow-up is implied.
            messages.Warn("Could not find config/applicationmetadata.json; skipped eFormidling migration.");
            return new MigrationResult(messages);
        }

        var metadataRewriter = new ApplicationMetadataEFormidlingRewriter(metadataFile);
        var config = metadataRewriter.ReadLegacyConfiguration();
        if (config is null)
        {
            // No eFormidling block at all - nothing to migrate.
            return new MigrationResult(messages);
        }

        if (config.IsEmpty)
        {
            // An empty (or null) block never configured anything; removing it clears the analyzer
            // error without adding a service task.
            await metadataRewriter.StripEFormidlingBlock();
            messages.WarnRange(metadataRewriter.GetWarnings());
            messages.Warn(
                "Removed an empty legacy eFormidling block from applicationmetadata.json; no eFormidling "
                    + "service task was added."
            );
            return metadataRewriter.ManualActionRequired ? FollowUp(messages) : new MigrationResult(messages);
        }

        var reportedMetadataWarnings = metadataRewriter.GetWarnings().Count;
        messages.WarnRange(metadataRewriter.GetWarnings());

        if (string.IsNullOrWhiteSpace(config.SendAfterTaskId))
        {
            // Without a sendAfterTaskId the legacy backend never sent a shipment, but the block
            // still holds configuration the developer may want to keep. Leave everything in place
            // (the analyzer error keeps pointing at it) so nothing is lost silently.
            messages.Todo(
                "The legacy eFormidling configuration has no sendAfterTaskId, so there is no task to attach "
                    + "the eFormidling service task to (the legacy backend never sent a shipment for this "
                    + "configuration). Left applicationmetadata.json unchanged - add an 'eFormidling' service "
                    + "task manually or remove the eFormidling block."
            );
            return new MigrationResult(messages);
        }

        var processFile = AppFiles.Resolve(_projectFolder, "config/process/process.bpmn");
        if (processFile is null)
        {
            messages.Todo(
                "applicationmetadata.json configures legacy eFormidling, but config/process/process.bpmn "
                    + "was not found; cannot add the eFormidling service task. Left applicationmetadata.json "
                    + "unchanged."
            );
            return new MigrationResult(messages);
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
        messages.WarnRange(processRewriter.GetWarnings());

        if (result == EFormidlingInsertResult.Skipped)
        {
            // Keep the legacy block (and the appsettings gate): stripping it now would leave the app
            // with neither the v8 configuration nor the v9 service task, silently dropping the
            // shipment - and the analyzer error is what tells the developer the migration needs
            // manual work.
            messages.Todo(
                "Left the eFormidling block in applicationmetadata.json unchanged because the eFormidling "
                    + "service task could not be inserted automatically. Add the service task manually (or fix "
                    + "the process) and re-run the upgrade to strip the block."
            );
            return new MigrationResult(messages);
        }

        if (result == EFormidlingInsertResult.Inserted)
        {
            await processRewriter.Write();

            if (!gate.EnabledAnywhere)
            {
                messages.Warn(
                    "AppSettings:EnableEFormidling was not enabled in any appsettings file, so the legacy "
                        + "configuration never sent a shipment. The migrated service task carries the "
                        + "configuration but is <altinn:disabled> - remove the disabled element in process.bpmn "
                        + "to activate it."
                );
            }
            else if (!gate.EnabledEverywhere)
            {
                messages.Warn(
                    "AppSettings:EnableEFormidling differed per environment. The migrated service task mirrors "
                        + $"that with <altinn:disabled env=\"...\"> element(s) for "
                        + $"[{string.Join(", ", gate.DisabledEnvironments())}] - review them in process.bpmn."
                );
            }
        }

        // Strip the legacy configuration last, so a failure above leaves it untouched.
        await metadataRewriter.StripEFormidlingBlock();
        await settingsRewriter.StripEnableEFormidling();
        messages.WarnRange(metadataRewriter.GetWarnings().Skip(reportedMetadataWarnings));
        messages.WarnRange(settingsRewriter.GetWarnings());

        if (config.ServiceId is not null)
        {
            messages.Warn(
                $"The legacy eFormidling serviceId ('{config.ServiceId}') has no equivalent in the v9 service "
                    + "task configuration and was dropped - the eFormidling integration point resolves the "
                    + "service from the receiver's capabilities."
            );
        }

        if (gate.EnabledAnywhere && !AppRegistersEFormidlingServices(appFolder))
        {
            messages.Warn(
                "Could not find an eFormidling registration in the app's C# code. The v9 eFormidling "
                    + "service task fails at runtime without it - make sure Program.cs registers the services "
                    + "with AddEFormidling().WithMetadata<T>() (and that T implements IEFormidlingMetadata)."
            );
        }

        // The block was migrated and stripped; the only manual follow-up left is if a strip could
        // be applied safely (unusual formatting, or a result that would not parse).
        return metadataRewriter.ManualActionRequired || settingsRewriter.ManualActionRequired
            ? FollowUp(messages)
            : new MigrationResult(messages);
    }

    /// <summary>
    /// Ends the migration with the shared follow-up to-do, after the warning that says what stopped it.
    /// </summary>
    private static MigrationResult FollowUp(List<UpgradeMessage> messages)
    {
        messages.Todo("eFormidling service task migration needs manual follow-up. Review the warnings above.");
        return new MigrationResult(messages);
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
                    relative.StartsWith("bin" + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase)
                    || relative.StartsWith("obj" + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase)
                )
                {
                    continue;
                }

                // Deliberately the shared prefix of the v8 and v9 method names, so this reads the same
                // whether or not the registration rewrite has already run over the file.
                if (File.ReadAllText(file).Contains("AddEFormidling", StringComparison.Ordinal))
                    return true;
            }
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
        {
            // The scan runs after the migration has already been applied; if reading the app's files
            // fails we simply skip this advisory warning rather than fail an otherwise-completed run.
            return true;
        }

        return false;
    }
}

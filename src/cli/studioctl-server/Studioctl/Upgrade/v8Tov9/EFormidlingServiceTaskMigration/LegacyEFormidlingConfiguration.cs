namespace Altinn.Studio.Cli.Upgrade.v8Tov9.EFormidlingServiceTaskMigration;

/// <summary>
/// The legacy eFormidling configuration from the <c>eFormidling</c> block in applicationmetadata.json
/// (the platform Storage <c>EFormidlingContract</c> shape). String values are kept verbatim so the
/// migration reproduces them exactly in the BPMN service task configuration.
/// </summary>
internal sealed record LegacyEFormidlingConfiguration(
    string? ServiceId,
    string? DpfShipmentType,
    string? Receiver,
    string? SendAfterTaskId,
    string? Process,
    string? Standard,
    string? TypeVersion,
    string? Type,
    string? SecurityLevel,
    IReadOnlyList<string> DataTypes
)
{
    /// <summary>
    /// True when the block carries no configuration at all (e.g. <c>"eFormidling": {}</c> or
    /// <c>"eFormidling": null</c>). Such a block never did anything and can be removed without
    /// creating a service task.
    /// </summary>
    public bool IsEmpty =>
        ServiceId is null
        && DpfShipmentType is null
        && Receiver is null
        && SendAfterTaskId is null
        && Process is null
        && Standard is null
        && TypeVersion is null
        && Type is null
        && SecurityLevel is null
        && DataTypes.Count == 0;
}

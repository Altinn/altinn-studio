namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;

/// <summary>
/// Adds the <c>IInstanceDataAccessor dataAccessor</c> parameter to app implementations of
/// <c>IProcessExclusiveGateway.FilterAsync</c>. v9 removed the obsolete overload without it, so a gateway that
/// implements only that one no longer satisfies the interface. The warning for each gateway asks the developer to
/// read the instance's data through the accessor instead of <c>IDataClient</c>. A gateway that already implements
/// both overloads loses its explicit implementation of the old one; see <see cref="InterfaceParameterMigration"/>.
/// </summary>
internal sealed class ExclusiveGatewayDataAccessorMigration
{
    /// <summary>The interface this migration covers, for step summaries.</summary>
    public const string InterfaceName = "IProcessExclusiveGateway";

    private static readonly InterfaceParameterMigration.ChangedInterface[] _changedInterfaces =
    [
        new(
            "Altinn.App.Core.Features",
            InterfaceName,
            new Dictionary<string, string[]>(StringComparer.Ordinal)
            {
                ["FilterAsync"] = ["List", "Instance", "ProcessGatewayInformation"],
            }
        ),
    ];

    private static readonly InterfaceParameterMigration.AddedParameter _parameter = new(
        TypeName: "IInstanceDataAccessor",
        FullTypeName: "Altinn.App.Core.Features.IInstanceDataAccessor",
        Name: "dataAccessor",
        Position: 2,
        IsOptional: false,
        Advice: "Read the instance's data through it instead of IDataClient: the accessor reads as the app, while a "
            + "direct IDataClient call acts as the user calling process/next, and the accessor does not see what "
            + "such a call changes."
    );

    private readonly InterfaceParameterMigration _migration;

    public ExclusiveGatewayDataAccessorMigration(CSharpSourceScanner scanner)
    {
        _migration = new InterfaceParameterMigration(scanner, _changedInterfaces, _parameter);
    }

    public MigrationResult Migrate(CancellationToken cancellationToken) => _migration.Migrate(cancellationToken);
}

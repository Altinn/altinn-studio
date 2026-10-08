namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;

/// <summary>
/// Adds the trailing <c>CancellationToken cancellationToken = default</c> parameter that the app-implemented
/// payment interfaces gained in v9: <c>IPaymentProcessor</c> (<c>StartPayment</c>, <c>TerminatePayment</c>,
/// <c>GetPaymentStatus</c>) and <c>IOrderDetailsCalculator</c> (<c>CalculateOrderDetails</c>). See
/// <see cref="InterfaceParameterMigration"/> for how implementations are found and what is reported instead of
/// rewritten.
/// </summary>
internal sealed class CancellationTokenParameterMigration
{
    private static readonly InterfaceParameterMigration.ChangedInterface[] _changedInterfaces =
    [
        new(
            "Altinn.App.Core.Features.Payment.Processors",
            "IPaymentProcessor",
            new Dictionary<string, string[]>(StringComparer.Ordinal)
            {
                ["StartPayment"] = ["Instance", "OrderDetails", "string"],
                ["TerminatePayment"] = ["Instance", "PaymentInformation"],
                ["GetPaymentStatus"] = ["Instance", "string", "decimal", "string"],
            }
        ),
        new(
            "Altinn.App.Core.Features.Payment",
            "IOrderDetailsCalculator",
            new Dictionary<string, string[]>(StringComparer.Ordinal)
            {
                ["CalculateOrderDetails"] = ["Instance", "string"],
            }
        ),
    ];

    private static readonly InterfaceParameterMigration.AddedParameter _parameter = new(
        TypeName: "CancellationToken",
        FullTypeName: "System.Threading.CancellationToken",
        Name: "cancellationToken",
        Position: null,
        IsOptional: true,
        Advice: "Forward it to the cancellable calls the implementation makes, such as HTTP requests or data lookups."
    );

    /// <summary>The interfaces this migration covers, for step summaries.</summary>
    public static IEnumerable<string> InterfaceNames =>
        _changedInterfaces.Select(static changed => changed.Name).Order(StringComparer.Ordinal);

    private readonly InterfaceParameterMigration _migration;

    public CancellationTokenParameterMigration(CSharpSourceScanner scanner)
    {
        _migration = new InterfaceParameterMigration(scanner, _changedInterfaces, _parameter);
    }

    public MigrationResult Migrate(CancellationToken cancellationToken) => _migration.Migrate(cancellationToken);
}

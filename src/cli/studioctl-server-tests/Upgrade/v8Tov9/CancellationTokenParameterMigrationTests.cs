using Altinn.Studio.Cli.Upgrade.v8Tov9;
using Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;
using Microsoft.CodeAnalysis;

namespace Studioctl.Tests.Upgrade.v8Tov9;

/// <summary>
/// Covers the v9 <c>CancellationToken</c> parameter added to the app-implemented payment interfaces. The
/// contract is "the migrated app compiles against v9", so every rewrite is compiled against a v9-shaped
/// stub instead of being compared as text; the few text assertions pin what must survive a rewrite
/// (comments, line endings, and a one-parameter-per-line layout). Readable type names are tested in the final pass.
/// Most cases run both with a semantic model (the app compiled against v8) and without (syntax fallback).
/// </summary>
public sealed class CancellationTokenParameterMigrationTests : IDisposable
{
    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    private string AppFolder => Path.Combine(_app.Root, "App");

    /// <summary>
    /// Writes a fixture file with the given line ending. The raw string literals below carry whatever
    /// line endings this source file was checked out with - CRLF on Windows - while the assertions pin
    /// an exact LF-delimited layout, so every fixture states the endings it means to exercise.
    /// </summary>
    private string Write(string relativePath, string content, string lineEnding = "\n") =>
        _app.Write(relativePath, content.ReplaceLineEndings(lineEnding));

    /// <summary>
    /// The payment surface the migration targets, in its v8 or v9 shape. <c>Instance</c> really lives in the
    /// storage interface package; only the interfaces' assembly matters to the migration, so one stub holds both.
    /// </summary>
    private static string SdkStub(bool v9)
    {
        var token = v9 ? ", System.Threading.CancellationToken cancellationToken = default" : "";
        return $$"""
            #nullable enable
            using System.Threading.Tasks;
            using Altinn.App.Core.Features.Payment.Models;
            using Altinn.Platform.Storage.Interface.Models;

            namespace Altinn.Platform.Storage.Interface.Models
            {
                public class Instance { }
            }

            namespace Altinn.App.Core.Features.Payment.Models
            {
                public class OrderDetails { }

                public class PaymentDetails { }

                public class PaymentInformation { }

                public enum PaymentStatus { Created, Paid }
            }

            namespace Altinn.App.Core.Features.Payment.Processors
            {
                public interface IPaymentProcessor
                {
                    string PaymentProcessorId { get; }

                    Task<PaymentDetails> StartPayment(Instance instance, OrderDetails orderDetails, string? language{{token}});

                    Task<bool> TerminatePayment(Instance instance, PaymentInformation paymentInformation{{token}});

                    Task<(PaymentStatus status, PaymentDetails paymentDetails)> GetPaymentStatus(
                        Instance instance,
                        string paymentId,
                        decimal expectedTotalIncVat,
                        string? language{{token}}
                    );
                }
            }

            namespace Altinn.App.Core.Features.Payment
            {
                public interface IOrderDetailsCalculator
                {
                    Task<OrderDetails> CalculateOrderDetails(Instance instance, string? language{{token}});
                }
            }
            """;
    }

    private static readonly Lazy<MetadataReference> _v8Sdk = new(static () =>
        SemanticScannerFactory.EmitStubAssembly("Altinn.App.Core", SdkStub(v9: false))
    );

    private static readonly Lazy<MetadataReference> _v9Sdk = new(static () =>
        SemanticScannerFactory.EmitStubAssembly("Altinn.App.Core", SdkStub(v9: true))
    );

    /// <summary>The usings every fixture file needs; the v8 app template has no implicit usings.</summary>
    private const string ModelUsings = """
        using System;
        using System.Threading.Tasks;
        using Altinn.App.Core.Features.Payment;
        using Altinn.App.Core.Features.Payment.Models;
        using Altinn.App.Core.Features.Payment.Processors;
        using Altinn.Platform.Storage.Interface.Models;
        """;

    /// <summary>A complete v8 <c>IPaymentProcessor</c> implementation with single-line parameter lists.</summary>
    private const string V8Processor = """
        public class MyPaymentProcessor : IPaymentProcessor
        {
            public string PaymentProcessorId => "mine";

            public Task<PaymentDetails> StartPayment(Instance instance, OrderDetails orderDetails, string? language) =>
                throw new NotImplementedException();

            public Task<bool> TerminatePayment(Instance instance, PaymentInformation paymentInformation) =>
                throw new NotImplementedException();

            public Task<(PaymentStatus status, PaymentDetails paymentDetails)> GetPaymentStatus(Instance instance, string paymentId, decimal expectedTotalIncVat, string? language) =>
                throw new NotImplementedException();
        }
        """;

    private const string V8Calculator = """
        public class MyCalculator : IOrderDetailsCalculator
        {
            public string MethodName => nameof(CalculateOrderDetails);

            public Task<OrderDetails> Calculate(Instance instance) => CalculateOrderDetails(instance, null);

            public static Task<OrderDetails>? CalculateIfPresent(MyCalculator? calculator, Instance instance) =>
                calculator?.CalculateOrderDetails(instance, null);

            public Task<OrderDetails> CalculateOrderDetails(Instance instance, string? language) =>
                throw new NotImplementedException();
        }
        """;

    private CSharpSourceScanner Scanner(bool semantic, MetadataReference? sdk = null) =>
        semantic ? SemanticScannerFactory.CreateScanner(AppFolder, sdk ?? _v8Sdk.Value) : new(AppFolder);

    private MigrationResult Migrate(bool semantic, MetadataReference? sdk = null) =>
        new CancellationTokenParameterMigration(Scanner(semantic, sdk)).Migrate(TestContext.Current.CancellationToken);

    private void AssertCompilesAgainstV9(params string[] preprocessorSymbols)
    {
        var errors = SemanticScannerFactory.CompileErrors(AppFolder, _v9Sdk.Value, preprocessorSymbols);
        Assert.True(
            errors.Count == 0,
            $"Migrated app does not compile against v9 (symbols: {string.Join(",", preprocessorSymbols)}):\n"
                + string.Join("\n", errors)
        );
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task AllChangedMethods_GetTheParameter_AndExistingCallsCompileAgainstV9(bool semantic)
    {
        // The rewrite compiles without adding imports. The final pass can simplify its qualified references
        // after the project and all source files have been upgraded.
        var processor = Write("logic/MyPaymentProcessor.cs", ModelUsings + "\n" + V8Processor);
        var calculator = Write("logic/MyCalculator.cs", ModelUsings + "\n" + V8Calculator);

        var result = Migrate(semantic);

        Assert.Empty(result.Todos);
        Assert.Equal(4, result.Warnings.Count);
        Assert.Contains(
            result.Warnings,
            w =>
                w.Contains("MyPaymentProcessor.cs:")
                && w.Contains("MyPaymentProcessor.StartPayment")
                && w.Contains("IPaymentProcessor")
        );
        Assert.Contains(
            result.Warnings,
            w => w.Contains("MyCalculator.CalculateOrderDetails") && w.Contains("IOrderDetailsCalculator")
        );
        AssertCompilesAgainstV9();
        var migratedProcessor = await File.ReadAllTextAsync(processor, TestContext.Current.CancellationToken);
        Assert.Contains(
            "string? language, global::System.Threading.CancellationToken cancellationToken = default)",
            migratedProcessor
        );
        Assert.Contains(
            "PaymentInformation paymentInformation, global::System.Threading.CancellationToken cancellationToken = default)",
            migratedProcessor
        );
        Assert.DoesNotContain("using System.Threading;", migratedProcessor);
        var migratedCalculator = await File.ReadAllTextAsync(calculator, TestContext.Current.CancellationToken);
        Assert.Contains(
            "string? language, global::System.Threading.CancellationToken cancellationToken = default)",
            migratedCalculator
        );
        Assert.DoesNotContain("using System.Threading;", migratedCalculator);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task ImplementationSharedWithAnUnchangedInterface_IsReportedInsteadOfRewritten(bool semantic)
    {
        // Adding the parameter would satisfy IOrderDetailsCalculator and break the app's own interface.
        Write(
            "logic/IPriceCalculator.cs",
            ModelUsings
                + """

                public interface IPriceCalculator
                {
                    Task<OrderDetails> CalculateOrderDetails(Instance instance, string? language);
                }
                """
        );
        var calculator = Write(
            "logic/PriceCalculator.cs",
            ModelUsings
                + """

                public class PriceCalculator : IOrderDetailsCalculator, IPriceCalculator
                {
                    public Task<OrderDetails> CalculateOrderDetails(Instance instance, string? language) =>
                        throw new NotImplementedException();
                }
                """
        );
        var before = await File.ReadAllTextAsync(calculator, TestContext.Current.CancellationToken);

        var result = Migrate(semantic);

        Assert.True(result.RequiresManualFollowUp);
        var todo = Assert.Single(result.Todos);
        Assert.Contains("PriceCalculator.cs:", todo);
        Assert.Contains("PriceCalculator.CalculateOrderDetails", todo);
        Assert.Contains("IPriceCalculator.CalculateOrderDetails", todo);
        Assert.Empty(result.Warnings);
        Assert.Equal(before, await File.ReadAllTextAsync(calculator, TestContext.Current.CancellationToken));
    }

    [Fact]
    public async Task ImplementationSharedThroughAnOverride_IsReportedInsteadOfRewritten_WithASemanticModel()
    {
        // The base class implements the changed interface, the derived class overrides that method and also
        // offers it to an unchanged interface; neither declaration can change on its own.
        var baseFile = Write(
            "logic/CalculatorBase.cs",
            ModelUsings
                + """

                public interface IPriceCalculator
                {
                    Task<OrderDetails> CalculateOrderDetails(Instance instance, string? language);
                }

                public class CalculatorBase : IOrderDetailsCalculator
                {
                    public virtual Task<OrderDetails> CalculateOrderDetails(Instance instance, string? language) =>
                        throw new NotImplementedException();
                }
                """
        );
        var derivedFile = Write(
            "logic/PriceCalculator.cs",
            ModelUsings
                + """

                public class PriceCalculator : CalculatorBase, IPriceCalculator
                {
                    public override Task<OrderDetails> CalculateOrderDetails(Instance instance, string? language) =>
                        throw new NotImplementedException();
                }
                """
        );
        var before = (
            await File.ReadAllTextAsync(baseFile, TestContext.Current.CancellationToken),
            await File.ReadAllTextAsync(derivedFile, TestContext.Current.CancellationToken)
        );

        var result = Migrate(semantic: true);

        var todo = Assert.Single(result.Todos);
        Assert.Contains("IPriceCalculator.CalculateOrderDetails", todo);
        Assert.Empty(result.Warnings);
        Assert.Equal(
            before,
            (
                await File.ReadAllTextAsync(baseFile, TestContext.Current.CancellationToken),
                await File.ReadAllTextAsync(derivedFile, TestContext.Current.CancellationToken)
            )
        );
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task PartialMethod_IsReportedInsteadOfRewritten(bool semantic)
    {
        var defining = Write(
            "logic/MyCalculator.cs",
            ModelUsings
                + """

                public partial class MyCalculator : IOrderDetailsCalculator
                {
                    public partial Task<OrderDetails> CalculateOrderDetails(Instance instance, string? language);
                }
                """
        );
        var implementing = Write(
            "logic/MyCalculator.Impl.cs",
            ModelUsings
                + """

                public partial class MyCalculator
                {
                    public partial Task<OrderDetails> CalculateOrderDetails(Instance instance, string? language) =>
                        throw new NotImplementedException();
                }
                """
        );
        var before = (
            await File.ReadAllTextAsync(defining, TestContext.Current.CancellationToken),
            await File.ReadAllTextAsync(implementing, TestContext.Current.CancellationToken)
        );

        var result = Migrate(semantic);

        Assert.True(result.RequiresManualFollowUp);
        var todo = Assert.Single(result.Todos);
        Assert.Contains("MyCalculator.CalculateOrderDetails", todo);
        Assert.Contains("partial", todo);
        Assert.Empty(result.Warnings);
        Assert.Equal(
            before,
            (
                await File.ReadAllTextAsync(defining, TestContext.Current.CancellationToken),
                await File.ReadAllTextAsync(implementing, TestContext.Current.CancellationToken)
            )
        );
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task PrivateOverload_AndTheDelegateBoundToIt_AreLeftAlone(bool semantic)
    {
        // The private overload shares the name and arity but not the parameter types; adding an optional
        // parameter to it would break the method-group conversion (CS0123).
        var processor = Write(
            "logic/MyPaymentProcessor.cs",
            ModelUsings
                + """

                public class MyPaymentProcessor : IPaymentProcessor
                {
                    private readonly Func<Instance, OrderDetails, Uri, Task<PaymentDetails>> _redirecting;

                    public MyPaymentProcessor()
                    {
                        _redirecting = StartPayment;
                    }

                    public string PaymentProcessorId => "mine";

                    public Task<PaymentDetails> StartPayment(Instance instance, OrderDetails orderDetails, string? language) =>
                        StartPayment(instance, orderDetails, new Uri("https://example.com/return"));

                    private Task<PaymentDetails> StartPayment(Instance instance, OrderDetails orderDetails, Uri returnUrl) =>
                        Task.FromResult(new PaymentDetails());

                    public Task<bool> TerminatePayment(Instance instance, PaymentInformation paymentInformation) =>
                        throw new NotImplementedException();

                    public Task<(PaymentStatus status, PaymentDetails paymentDetails)> GetPaymentStatus(Instance instance, string paymentId, decimal expectedTotalIncVat, string? language) =>
                        throw new NotImplementedException();
                }
                """
        );

        var result = Migrate(semantic);

        if (semantic)
        {
            Assert.Empty(result.Todos);
            Assert.Equal(3, result.Warnings.Count);
            AssertCompilesAgainstV9();
        }
        else
        {
            Assert.Contains("particular overload", Assert.Single(result.Todos));
            Assert.Equal(2, result.Warnings.Count);
        }

        Assert.Contains(
            "StartPayment(Instance instance, OrderDetails orderDetails, Uri returnUrl)",
            await File.ReadAllTextAsync(processor, TestContext.Current.CancellationToken)
        );
    }

    [Theory]
    [InlineData("CalculateOrderDetails", true)]
    [InlineData("this.CalculateOrderDetails", true)]
    [InlineData("((IOrderDetailsCalculator)this).CalculateOrderDetails", true)]
    [InlineData("CalculateOrderDetails", false)]
    public async Task ImplementationUsedAsADelegate_IsReportedInsteadOfRewritten(string methodGroup, bool semantic)
    {
        var source =
            ModelUsings
            + $$"""

                public class MyCalculator : IOrderDetailsCalculator
                {
                    public Func<Instance, string?, Task<OrderDetails>> Factory() => {{methodGroup}};

                    public Task<OrderDetails> CalculateOrderDetails(Instance instance, string? language) =>
                        throw new NotImplementedException();
                }
                """;
        var path = Write("logic/MyCalculator.cs", source);
        var before = await File.ReadAllTextAsync(path, TestContext.Current.CancellationToken);

        var result = Migrate(semantic);

        Assert.Contains("method group", Assert.Single(result.Todos));
        Assert.Empty(result.Warnings);
        Assert.Equal(before, await File.ReadAllTextAsync(path, TestContext.Current.CancellationToken));
    }

    [Fact]
    public async Task DelegateBoundToAnOverride_LeavesTheWholeFamilyForManualMigration()
    {
        var basePath = Write(
            "logic/CalculatorBase.cs",
            ModelUsings
                + """

                public abstract class CalculatorBase : IOrderDetailsCalculator
                {
                    public abstract Task<OrderDetails> CalculateOrderDetails(Instance instance, string? language);
                }
                """
        );
        var derivedPath = Write(
            "logic/MyCalculator.cs",
            ModelUsings
                + """

                public class MyCalculator : CalculatorBase
                {
                    public Func<Instance, string?, Task<OrderDetails>> Factory() => CalculateOrderDetails;

                    public override Task<OrderDetails> CalculateOrderDetails(Instance instance, string? language) =>
                        throw new NotImplementedException();
                }
                """
        );
        var before = (
            await File.ReadAllTextAsync(basePath, TestContext.Current.CancellationToken),
            await File.ReadAllTextAsync(derivedPath, TestContext.Current.CancellationToken)
        );

        var result = Migrate(semantic: true);

        Assert.Contains("method group", Assert.Single(result.Todos));
        Assert.Empty(result.Warnings);
        Assert.Equal(
            before,
            (
                await File.ReadAllTextAsync(basePath, TestContext.Current.CancellationToken),
                await File.ReadAllTextAsync(derivedPath, TestContext.Current.CancellationToken)
            )
        );
    }

    [Fact]
    public void AppsOwnInterfaceOfTheSameName_IsLeftAlone_WithASemanticModel()
    {
        WriteAppWithItsOwnPaymentProcessorInterface();

        var result = Migrate(semantic: true);

        Assert.Empty(result.Messages);
        AssertCompilesAgainstV9();
    }

    [Fact]
    public async Task AppsOwnInterfaceOfTheSameName_IsReportedInsteadOfRewritten_WithoutASemanticModel()
    {
        var local = WriteAppWithItsOwnPaymentProcessorInterface();
        var before = await File.ReadAllTextAsync(local, TestContext.Current.CancellationToken);

        var result = Migrate(semantic: false);

        Assert.True(result.RequiresManualFollowUp);
        var todo = Assert.Single(result.Todos);
        Assert.Contains("LocalProcessor.cs:", todo);
        Assert.Contains("LocalProcessor.TerminatePayment", todo);
        Assert.Empty(result.Warnings);
        Assert.Equal(before, await File.ReadAllTextAsync(local, TestContext.Current.CancellationToken));
    }

    private string WriteAppWithItsOwnPaymentProcessorInterface()
    {
        Write(
            "logic/IPaymentProcessor.cs",
            """
            using System.Threading.Tasks;
            using Altinn.App.Core.Features.Payment.Models;
            using Altinn.Platform.Storage.Interface.Models;

            namespace MyApp.Payments
            {
                public interface IPaymentProcessor
                {
                    Task<bool> TerminatePayment(Instance instance, PaymentInformation paymentInformation);
                }
            }
            """
        );
        return Write(
            "logic/LocalProcessor.cs",
            """
            using System;
            using System.Threading.Tasks;
            using Altinn.App.Core.Features.Payment.Models;
            using Altinn.Platform.Storage.Interface.Models;
            using MyApp.Payments;

            public class LocalProcessor : IPaymentProcessor
            {
                public Task<bool> TerminatePayment(Instance instance, PaymentInformation paymentInformation) =>
                    throw new NotImplementedException();
            }
            """
        );
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task UnrelatedTypeWithTheSameMethodNames_IsLeftAlone(bool semantic)
    {
        var path = Write(
            "logic/NotAProcessor.cs",
            ModelUsings
                + """

                public class NotAProcessor
                {
                    public Task<bool> TerminatePayment(Instance instance, PaymentInformation paymentInformation) =>
                        throw new NotImplementedException();

                    public Task<OrderDetails> CalculateOrderDetails(Instance instance, string? language) =>
                        throw new NotImplementedException();
                }
                """
        );
        var before = await File.ReadAllTextAsync(path, TestContext.Current.CancellationToken);

        var result = Migrate(semantic);

        Assert.Empty(result.Messages);
        Assert.Equal(before, await File.ReadAllTextAsync(path, TestContext.Current.CancellationToken));
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task MethodAlreadyUsingTheName_IsReportedInsteadOfRewritten(bool semantic)
    {
        // A second `cancellationToken` in the enclosing scope is CS0136, and a parameter would silently shadow a
        // field of that name; either way the developer has to choose.
        var processor = Write(
            "logic/MyPaymentProcessor.cs",
            "using System.Threading;\n"
                + ModelUsings
                + """

                public class MyPaymentProcessor : IPaymentProcessor
                {
                    public string PaymentProcessorId => "mine";

                    public Task<PaymentDetails> StartPayment(Instance instance, OrderDetails orderDetails, string? language) =>
                        throw new NotImplementedException();

                    public Task<bool> TerminatePayment(Instance instance, PaymentInformation paymentInformation)
                    {
                        CancellationToken cancellationToken = default;
                        return Task.FromResult(!cancellationToken.IsCancellationRequested);
                    }

                    public Task<(PaymentStatus status, PaymentDetails paymentDetails)> GetPaymentStatus(Instance instance, string paymentId, decimal expectedTotalIncVat, string? language) =>
                        throw new NotImplementedException();
                }
                """
        );

        var result = Migrate(semantic);

        Assert.True(result.RequiresManualFollowUp);
        var todo = Assert.Single(result.Todos);
        Assert.Contains("MyPaymentProcessor.TerminatePayment", todo);
        Assert.Contains("'cancellationToken'", todo);
        Assert.Equal(2, result.Warnings.Count);
        var migrated = await File.ReadAllTextAsync(processor, TestContext.Current.CancellationToken);
        Assert.Contains("TerminatePayment(Instance instance, PaymentInformation paymentInformation)\n", migrated);
        Assert.Contains(
            "string? language, global::System.Threading.CancellationToken cancellationToken = default)",
            migrated
        );
        // The report is honest: until the developer acts, the app does not satisfy the v9 interface.
        Assert.Contains(SemanticScannerFactory.CompileErrors(AppFolder, _v9Sdk.Value), e => e.Id == "CS0535");
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task ExplicitImplementation_GetsTheParameterWithoutADefault(bool semantic)
    {
        var processor = Write(
            "logic/MyPaymentProcessor.cs",
            ModelUsings
                + """

                public class MyPaymentProcessor : IPaymentProcessor
                {
                    string IPaymentProcessor.PaymentProcessorId => "mine";

                    Task<PaymentDetails> IPaymentProcessor.StartPayment(Instance instance, OrderDetails orderDetails, string? language) =>
                        throw new NotImplementedException();

                    Task<bool> IPaymentProcessor.TerminatePayment(Instance instance, PaymentInformation paymentInformation) =>
                        throw new NotImplementedException();

                    Task<(PaymentStatus status, PaymentDetails paymentDetails)> IPaymentProcessor.GetPaymentStatus(Instance instance, string paymentId, decimal expectedTotalIncVat, string? language) =>
                        throw new NotImplementedException();
                }
                """
        );

        var result = Migrate(semantic);

        Assert.Equal(3, result.Warnings.Count);
        AssertCompilesAgainstV9();
        var migrated = await File.ReadAllTextAsync(processor, TestContext.Current.CancellationToken);
        Assert.Contains(
            "IPaymentProcessor.TerminatePayment(Instance instance, PaymentInformation paymentInformation, global::System.Threading.CancellationToken cancellationToken)",
            migrated
        );
        Assert.DoesNotContain("using System.Threading;", migrated);
    }

    [Fact]
    public void InheritedImplementation_IsMigratedTogetherWithItsOverrides_WithASemanticModel()
    {
        WriteProcessorHierarchy();

        var result = Migrate(semantic: true);

        Assert.Empty(result.Todos);
        Assert.Equal(4, result.Warnings.Count);
        Assert.Contains(result.Warnings, w => w.Contains("PaymentProcessorBase.StartPayment"));
        Assert.Contains(result.Warnings, w => w.Contains("MyPaymentProcessor.StartPayment"));
        AssertCompilesAgainstV9();
    }

    [Fact]
    public void VirtualImplementation_HasItsOverridesReported_WithoutASemanticModel()
    {
        // Syntax alone finds the base type (it names the interface) but not the override, so the override is
        // left for the developer rather than guessed at.
        WriteProcessorHierarchy();

        var result = Migrate(semantic: false);

        Assert.Equal(3, result.Warnings.Count);
        var todo = Assert.Single(result.Todos);
        Assert.Contains("PaymentProcessorBase.StartPayment", todo);
        Assert.Contains("override", todo);
    }

    private void WriteProcessorHierarchy()
    {
        Write(
            "logic/PaymentProcessorBase.cs",
            ModelUsings
                + """

                public abstract class PaymentProcessorBase : IPaymentProcessor
                {
                    public abstract string PaymentProcessorId { get; }

                    public abstract Task<PaymentDetails> StartPayment(Instance instance, OrderDetails orderDetails, string? language);

                    public Task<bool> TerminatePayment(Instance instance, PaymentInformation paymentInformation) =>
                        throw new NotImplementedException();

                    public Task<(PaymentStatus status, PaymentDetails paymentDetails)> GetPaymentStatus(Instance instance, string paymentId, decimal expectedTotalIncVat, string? language) =>
                        throw new NotImplementedException();
                }
                """
        );
        Write(
            "logic/MyPaymentProcessor.cs",
            ModelUsings
                + """

                public class MyPaymentProcessor : PaymentProcessorBase
                {
                    public override string PaymentProcessorId => "mine";

                    public override Task<PaymentDetails> StartPayment(Instance instance, OrderDetails orderDetails, string? language) =>
                        throw new NotImplementedException();
                }
                """
        );
    }

    [Fact]
    public async Task MultiLineParameterList_KeepsItsLayoutAndComments()
    {
        var processor = Write(
            "logic/MyPaymentProcessor.cs",
            "using System.Threading;\n"
                + ModelUsings
                + """

                public class MyPaymentProcessor : IPaymentProcessor
                {
                    public string PaymentProcessorId => "mine";

                    public Task<PaymentDetails> StartPayment(Instance instance, OrderDetails orderDetails, string? language) =>
                        throw new NotImplementedException();

                    public Task<bool> TerminatePayment(
                        Instance instance,
                        // Only the payment id is used.
                        PaymentInformation paymentInformation
                    ) => throw new NotImplementedException();

                    public Task<(PaymentStatus status, PaymentDetails paymentDetails)> GetPaymentStatus(
                        Instance instance,
                        string paymentId,
                        decimal expectedTotalIncVat,
                        string? language // not used yet
                    )
                    {
                        throw new NotImplementedException();
                    }
                }
                """
        );

        Migrate(semantic: true);

        AssertCompilesAgainstV9();
        var migrated = await File.ReadAllTextAsync(processor, TestContext.Current.CancellationToken);
        Assert.Contains(
            "        // Only the payment id is used.\n        PaymentInformation paymentInformation,\n        global::System.Threading.CancellationToken cancellationToken = default\n    ) =>",
            migrated
        );
        Assert.Contains(
            "        string? language, // not used yet\n        global::System.Threading.CancellationToken cancellationToken = default\n    )\n",
            migrated
        );
        Assert.Equal(1, migrated.Split("not used yet").Length - 1);
    }

    [Fact]
    public async Task OverrideFamily_WhereOneMemberUsesTheName_IsLeftWholeAndReported()
    {
        // The name check has to hold for the whole override family. Adding the parameter to the base while
        // skipping an override that uses the name would leave the app with a signature mismatch.
        var basePath = Write(
            "logic/PaymentProcessorBase.cs",
            ModelUsings
                + """

                public abstract class PaymentProcessorBase : IPaymentProcessor
                {
                    public abstract string PaymentProcessorId { get; }

                    public abstract Task<PaymentDetails> StartPayment(Instance instance, OrderDetails orderDetails, string? language);

                    public Task<bool> TerminatePayment(Instance instance, PaymentInformation paymentInformation) =>
                        throw new NotImplementedException();

                    public Task<(PaymentStatus status, PaymentDetails paymentDetails)> GetPaymentStatus(Instance instance, string paymentId, decimal expectedTotalIncVat, string? language) =>
                        throw new NotImplementedException();
                }
                """
        );
        var derivedPath = Write(
            "logic/MyPaymentProcessor.cs",
            "using System.Threading;\n"
                + ModelUsings
                + """

                public class MyPaymentProcessor : PaymentProcessorBase
                {
                    public override string PaymentProcessorId => "mine";

                    public override Task<PaymentDetails> StartPayment(Instance instance, OrderDetails orderDetails, string? language)
                    {
                        CancellationToken cancellationToken = default;
                        return Task.FromResult<PaymentDetails>(cancellationToken.IsCancellationRequested ? null! : null!);
                    }
                }
                """
        );
        var result = Migrate(semantic: true);

        // The whole family is reported and left alone. The other members of the base class are their own
        // families and are still migrated, so only the StartPayment signatures must survive untouched.
        Assert.True(result.RequiresManualFollowUp);
        var todo = Assert.Single(result.Todos, message => message.Contains("StartPayment", StringComparison.Ordinal));
        Assert.Contains("'cancellationToken'", todo);
        Assert.Contains("MyPaymentProcessor.StartPayment", todo);
        const string v8Signature = "StartPayment(Instance instance, OrderDetails orderDetails, string? language)";
        Assert.Contains(v8Signature, await File.ReadAllTextAsync(basePath, TestContext.Current.CancellationToken));
        Assert.Contains(v8Signature, await File.ReadAllTextAsync(derivedPath, TestContext.Current.CancellationToken));

        // The app does not satisfy the v9 interface until the developer acts (CS0535), but the override family
        // still agrees with itself - a half-applied rewrite would show up as CS0115/CS0534/CS0506.
        var errors = SemanticScannerFactory.CompileErrors(AppFolder, _v9Sdk.Value);
        Assert.Contains(errors, error => error.Id == "CS0535");
        Assert.DoesNotContain(errors, error => error.Id is "CS0115" or "CS0534" or "CS0506");
    }

    [Fact]
    public async Task FileLineEndings_AreKept()
    {
        var crlf = Write("logic/MyCalculator.cs", ModelUsings + "\n" + V8Calculator, "\r\n");
        var lf = Write("logic/MyPaymentProcessor.cs", ModelUsings + "\n" + V8Processor);

        Migrate(semantic: true);

        AssertCompilesAgainstV9();
        Assert.DoesNotContain(
            "\n",
            (await File.ReadAllTextAsync(crlf, TestContext.Current.CancellationToken)).Replace("\r\n", "")
        );
        Assert.DoesNotContain("\r", await File.ReadAllTextAsync(lf, TestContext.Current.CancellationToken));
    }

    [Fact]
    public async Task RunningAgain_ChangesNothing()
    {
        var processor = Write("logic/MyPaymentProcessor.cs", ModelUsings + "\n" + V8Processor);
        Migrate(semantic: true);
        var migrated = await File.ReadAllTextAsync(processor, TestContext.Current.CancellationToken);

        // A second run right away has no v8 compilation to bind against (the app now targets v9), and a run
        // after the package bump binds against v9, where the implementation already matches.
        var withoutModel = Migrate(semantic: false);
        var againstV9 = Migrate(semantic: true, sdk: _v9Sdk.Value);

        Assert.Empty(withoutModel.Messages);
        Assert.Empty(againstV9.Messages);
        Assert.Equal(migrated, await File.ReadAllTextAsync(processor, TestContext.Current.CancellationToken));
    }
}

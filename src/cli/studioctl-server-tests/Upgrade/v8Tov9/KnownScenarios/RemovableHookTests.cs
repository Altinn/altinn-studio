using Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;
using Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration.ProcessHooks;
using Altinn.Studio.Cli.Upgrade.v8Tov9.KnownScenarios;
using Studioctl.Tests.Upgrade.v8Tov9.ProcessHooks;

namespace Studioctl.Tests.Upgrade.v8Tov9.KnownScenarios;

/// <summary>The hook classes the known scenarios may delete, on a minimal <c>IProcessEnd</c>.</summary>
public sealed class RemovableHookTests : IDisposable
{
    private const string HookPath = "logic/ProcessEnd.cs";
    private const string RegistrationsPath = "Startup/Services.cs";
    private const string NeighbourPath = "logic/Neighbour.cs";
    private const string UsesPath = "logic/Uses.cs";
    private const string Registration = "services.AddTransient<IProcessEnd, ProcessEnd>();";

    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    private string AppFolder => Path.Combine(_app.Root, "App");

    private const string Fields = """
                private readonly IDataClient _dataClient;

                public ProcessEnd(IDataClient dataClient)
                {
                    _dataClient = dataClient;
                }
        """;

    private const string End = """
                public async Task End(Instance instance, List<InstanceEvent> events)
                {
                    await Helper(instance);
                }
        """;

    private const string Helper = """
                private async Task Helper(Instance instance)
                {
                    await Task.CompletedTask;
                }
        """;

    private const string Members = Fields + "\n\n" + End + "\n\n" + Helper;

    /// <summary>The hook file; <paramref name="header"/> comes before the usings, <paramref name="before"/> after them.</summary>
    private static string Hook(
        string members = Members,
        string declaration = "public class ProcessEnd : IProcessEnd",
        string header = "",
        string before = "",
        string after = ""
    ) =>
        $$"""
            {{header}}
            using System.Collections.Generic;
            using System.Threading.Tasks;
            using Altinn.App.Core.Features;
            using Altinn.App.Core.Internal.Data;
            using Altinn.Platform.Storage.Interface.Models;
            {{before}}
            namespace Altinn.App.Logic
            {
                {{declaration}}
                {
            {{members}}
                }
            {{after}}
            }
            """;

    /// <summary>A file of the app that registers its services in a method, with these registrations.</summary>
    private static string Registrations(params string[] registrations) =>
        """
            using Altinn.App.Core.Features;
            using Altinn.App.Logic;
            using Microsoft.Extensions.DependencyInjection;

            namespace Altinn.App.Startup
            {
                public static class Services
                {
                    public static void Add(IServiceCollection services)
                    {
                        services.AddTransient<Neighbour>();

            """
        + string.Concat(registrations.Select(static registration => $"            {registration}\n"))
        + """
                    }
                }
            }

            """;

    private const string Neighbour = "namespace Altinn.App.Logic\n{\n    public class Neighbour { }\n}\n";

    private static string NeighbourWith(string member) =>
        $"namespace Altinn.App.Logic\n{{\n    public class Neighbour {{ }}\n\n    {member}\n}}\n";

    private CSharpSourceScanner Scanner(
        string? hook = null,
        string? registrations = null,
        string? neighbour = null,
        params (string Path, string Source)[] others
    )
    {
        _app.Write(HookPath, hook ?? Hook());
        _app.Write(RegistrationsPath, registrations ?? Registrations(Registration));
        _app.Write(NeighbourPath, neighbour ?? Neighbour);
        foreach (var (path, source) in others)
        {
            _app.Write(path, source);
        }

        return SemanticScannerFactory.CreateScanner(AppFolder, StorageCallStubs.V8);
    }

    private static RemovableHook? Of(CSharpSourceScanner scanner, string name = "ProcessEnd")
    {
        var files = scanner.Files.ToArray();
        var hook = Assert.Single(
            HookImplementation.Find(HookFamily.ProcessEnded, files),
            hook => hook.Type.Name == name
        );
        return RemovableHook.Of(hook, files, HookRegistrations.Find(files, [HookFamily.ProcessEnded]));
    }

    private static int LineOf(string source, string text) => ProcessHookStubs.LineOf(source, text);

    // --- What is removable --------------------------------------------------------------------------

    /// <summary>Hooks the scenarios can delete, and the name of the helper each has.</summary>
    public static TheoryData<string, string, string?> RemovableHooks =>
        new()
        {
            { "public class ProcessEnd : IProcessEnd", Members, "Helper" },
            {
                "public class ProcessEnd(IDataClient dataClient) : IProcessEnd",
                End.Replace("await Helper(instance);", "await Task.Delay(dataClient.GetHashCode());"),
                null
            },
        };

    [Theory]
    [MemberData(nameof(RemovableHooks))]
    public void TakesTheHook_WithFieldsConstructorsTheHookMethodAndOneHelper(
        string declaration,
        string members,
        string? helper
    )
    {
        var scanner = Scanner(Hook(members, declaration));

        var removable = Of(scanner);

        Assert.NotNull(removable);
        Assert.Equal(helper, removable.Helper?.Declaration.Identifier.ValueText);
    }

    /// <summary>A hook class that differs from a removable one in one respect each, and the app around it.</summary>
    public static TheoryData<string, string, string?, string?> NotRemovable =>
        new()
        {
            {
                "the class is partial",
                Hook(declaration: "public partial class ProcessEnd : IProcessEnd"),
                null,
                NeighbourWith("public partial class ProcessEnd { }")
            },
            {
                "the class has a base class",
                Hook(declaration: "public class ProcessEnd : Base, IProcessEnd"),
                null,
                NeighbourWith("public class Base { }")
            },
            {
                "the class implements another interface",
                Hook(declaration: "public class ProcessEnd : IProcessEnd, IMarker"),
                null,
                NeighbourWith("public interface IMarker { }")
            },
            {
                "the class has an attribute",
                Hook(declaration: "[System.Obsolete]\n    public class ProcessEnd : IProcessEnd"),
                null,
                null
            },
            { "the file declares another type", Hook(after: "\n    public class Other { }"), null, null },
            {
                "the file has an assembly attribute",
                Hook(before: "\n[assembly: System.Reflection.AssemblyMetadata(\"hook\", \"end\")]"),
                null,
                null
            },
            {
                "the file has code the compilation does not see",
                Hook(after: "\n#if NEVER\n    public class Other { }\n#endif"),
                null,
                null
            },
            { "the file has a global using", Hook(header: "global using System.Text;"), null, null },
            {
                "nothing else is in the class's namespace",
                Hook(),
                Registrations(Registration).Replace("<Neighbour>", "<Altinn.App.Other.Neighbour>"),
                "namespace Altinn.App.Other\n{\n    public class Neighbour { }\n}\n"
            },
            {
                "the hook method holds a comment",
                Hook(Members.Replace("await Helper(instance);", "// Clean up\n            await Helper(instance);")),
                null,
                null
            },
            {
                "the hook method holds a directive",
                Hook(
                    Members.Replace(
                        "await Helper(instance);",
                        "#pragma warning disable CS0168\n            await Helper(instance);"
                    )
                ),
                null,
                null
            },
            {
                "the helper holds a comment",
                Hook(
                    Members.Replace(
                        "await Task.CompletedTask;",
                        "// Nothing yet\n            await Task.CompletedTask;"
                    )
                ),
                null,
                null
            },
            {
                "the helper holds a directive",
                Hook(
                    Members.Replace(
                        "await Task.CompletedTask;",
                        "#pragma warning disable CS0168\n            await Task.CompletedTask;"
                    )
                ),
                null,
                null
            },
            {
                "the hook method has an expression body",
                Hook(
                    Fields
                        + "\n\n        public Task End(Instance instance, List<InstanceEvent> events) => Helper(instance);\n\n"
                        + Helper
                ),
                null,
                null
            },
            {
                "the helper has an expression body",
                Hook(
                    Fields + "\n\n" + End + "\n\n        private Task Helper(Instance instance) => Task.CompletedTask;"
                ),
                null,
                null
            },
            {
                "a field has an initializer",
                Hook(Members + "\n\n        private readonly string _name = \"end\";"),
                null,
                null
            },
            {
                "the constructor does more",
                Hook(
                    Members.Replace(
                        "_dataClient = dataClient;",
                        "_dataClient = dataClient ?? throw new System.ArgumentNullException(nameof(dataClient));"
                    )
                ),
                null,
                null
            },
            { "the class has a property", Hook(Members + "\n\n        public string Name => \"end\";"), null, null },
            {
                "the class has a second helper",
                Hook(Members + "\n\n" + Helper.Replace("Helper(", "Other(")),
                null,
                null
            },
            { "the class is registered twice", Hook(), Registrations(Registration, Registration), null },
            { "the class is not registered", Hook(), Registrations(), null },
            {
                "the registration is part of a chain",
                Hook(),
                Registrations("services.AddTransient<Neighbour>().AddTransient<IProcessEnd, ProcessEnd>();"),
                null
            },
            {
                "the registration is the statement of an if",
                Hook(),
                Registrations($"if (System.Environment.ProcessorCount > 1)\n                {Registration}"),
                null
            },
            {
                "the registration is in a block under a condition",
                Hook(),
                Registrations(
                    "if (System.Environment.ProcessorCount > 1)\n            {\n"
                        + $"                {Registration}\n            }}"
                ),
                null
            },
            {
                "the registration is a top-level statement",
                Hook(),
                "using Altinn.App.Core.Features;\nusing Altinn.App.Logic;\nusing Microsoft.Extensions.DependencyInjection;\n\n"
                    + $"IServiceCollection services = null!;\nservices.AddTransient<Neighbour>();\n{Registration}\n",
                null
            },
        };

    [Theory]
    [MemberData(nameof(NotRemovable))]
    public void LeavesTheHook_WhenItIsNotRemovable(
        string because,
        string hook,
        string? registrations,
        string? neighbour
    )
    {
        var scanner = Scanner(hook, registrations, neighbour);

        Assert.True(Of(scanner) is null, because);
    }

    /// <summary>Code elsewhere in the app that uses the class.</summary>
    public static TheoryData<string, string> Uses =>
        new()
        {
            {
                "a constructor parameter",
                "namespace Altinn.App.Logic\n{\n    public class Uses(ProcessEnd end) { }\n}\n"
            },
            {
                "typeof",
                "namespace Altinn.App.Logic\n{\n    public class Uses\n    {\n        public System.Type Type = typeof(ProcessEnd);\n    }\n}\n"
            },
            {
                "nameof",
                "namespace Altinn.App.Logic\n{\n    public class Uses\n    {\n        public string Name = nameof(ProcessEnd);\n    }\n}\n"
            },
            {
                "a using alias",
                "using End = Altinn.App.Logic.ProcessEnd;\n\nnamespace Altinn.App.Logic\n{\n    public class Uses { }\n}\n"
            },
            {
                "a derived class",
                "namespace Altinn.App.Logic\n{\n    public class Uses(Altinn.App.Core.Internal.Data.IDataClient client) : ProcessEnd(client) { }\n}\n"
            },
        };

    [Theory]
    [MemberData(nameof(Uses))]
    public void LeavesTheHook_WhenTheAppUsesItOutsideItsRegistration(string because, string uses)
    {
        var scanner = Scanner(others: (UsesPath, uses));

        Assert.True(Of(scanner) is null, because);
    }

    // --- Removal ------------------------------------------------------------------------------------

    [Fact]
    public void Remove_DeletesTheHookFileAndOnlyItsRegistrationLine()
    {
        var scanner = Scanner();
        var removable = Of(scanner);
        Assert.NotNull(removable);

        RemovableHook.Remove(scanner, [removable]);

        Assert.Equal(HookPath, removable.Path);
        Assert.Equal(
            $"{RegistrationsPath}:{LineOf(Registrations(Registration), Registration)}",
            removable.RegistrationLocation
        );
        Assert.False(File.Exists(Path.Combine(AppFolder, HookPath)));
        Assert.Equal(Registrations(), _app.Read(RegistrationsPath));
        Assert.Equal(Neighbour, _app.Read(NeighbourPath));
        Assert.DoesNotContain(
            scanner.Files,
            static file => file.RelativePath.EndsWith("ProcessEnd.cs", StringComparison.Ordinal)
        );
    }

    [Fact]
    public void Remove_RemovesTheRegistrationsOfTwoHooksInOneFile()
    {
        const string SecondPath = "logic/SecondEnd.cs";
        const string SecondRegistration = "services.AddTransient<IProcessEnd, SecondEnd>();";
        var second = Hook(Members.Replace("ProcessEnd(", "SecondEnd("), "public class SecondEnd : IProcessEnd");
        var scanner = Scanner(
            registrations: Registrations(Registration, SecondRegistration),
            others: (SecondPath, second)
        );
        RemovableHook[] removables =
        [
            Assert.IsType<RemovableHook>(Of(scanner)),
            Assert.IsType<RemovableHook>(Of(scanner, "SecondEnd")),
        ];

        RemovableHook.Remove(scanner, removables);

        Assert.Equal(Registrations(), _app.Read(RegistrationsPath));
        Assert.False(File.Exists(Path.Combine(AppFolder, HookPath)));
        Assert.False(File.Exists(Path.Combine(AppFolder, SecondPath)));
    }
}

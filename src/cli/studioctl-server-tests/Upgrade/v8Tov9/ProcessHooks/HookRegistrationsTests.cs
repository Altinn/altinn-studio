using static Studioctl.Tests.Upgrade.v8Tov9.ProcessHooks.ProcessHookStubs;

namespace Studioctl.Tests.Upgrade.v8Tov9.ProcessHooks;

/// <summary>
/// The registrations of a ported hook name the v9 interface, in whichever form the app registers it, and only
/// the registrations of hooks the port moved change.
/// </summary>
public sealed class HookRegistrationsTests : IDisposable
{
    private const string Hook = """
        public class Hook : IProcessTaskEnd
        {
            public Task End(string taskId, Instance instance) => Task.CompletedTask;
        }
        """;

    private const string TryAdd =
        "Microsoft.Extensions.DependencyInjection.Extensions.ServiceCollectionDescriptorExtensions";

    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    private string AppFolder => Path.Combine(_app.Root, "App");

    public static TheoryData<string, string, string> Registrations =>
        new()
        {
            {
                "type arguments",
                "services.AddTransient<IProcessTaskEnd, Hook>();",
                $"services.AddTransient<{IOnTaskEndingHandler}, Hook>();"
            },
            {
                // dpa/dpa-04-personvernombud registers its task-end hook as scoped.
                "scoped",
                "services.AddScoped<IProcessTaskEnd, Hook>();",
                $"services.AddScoped<{IOnTaskEndingHandler}, Hook>();"
            },
            {
                // brg/signeringsoppgave-sorm registers its task-start hook as a singleton.
                "singleton",
                "services.AddSingleton<IProcessTaskEnd, Hook>();",
                $"services.AddSingleton<{IOnTaskEndingHandler}, Hook>();"
            },
            {
                "typeof operands",
                "services.AddTransient(typeof(IProcessTaskEnd), typeof(Hook));",
                $"services.AddTransient(typeof({IOnTaskEndingHandler}), typeof(Hook));"
            },
            {
                "a factory",
                "services.AddTransient<IProcessTaskEnd>(sp => sp.GetRequiredService<Hook>());",
                $"services.AddTransient<{IOnTaskEndingHandler}>(sp => sp.GetRequiredService<Hook>());"
            },
            {
                // The Arbeidstilsynet package registers its hooks this way.
                "a factory that casts to the interface",
                "services.AddTransient(sp => (IProcessTaskEnd)(object)sp.GetRequiredService<Hook>());",
                $"services.AddTransient(sp => ({IOnTaskEndingHandler})(object)sp.GetRequiredService<Hook>());"
            },
            {
                "TryAdd with type arguments",
                $"{TryAdd}.TryAddTransient<IProcessTaskEnd, Hook>(services);",
                $"{TryAdd}.TryAddTransient<{IOnTaskEndingHandler}, Hook>(services);"
            },
            {
                "TryAdd with typeof operands",
                $"{TryAdd}.TryAddTransient(services, typeof(IProcessTaskEnd), typeof(Hook));",
                $"{TryAdd}.TryAddTransient(services, typeof({IOnTaskEndingHandler}), typeof(Hook));"
            },
        };

    [Theory]
    [MemberData(nameof(Registrations))]
    public void RegistersAPortedHookAsTheV9Interface(string label, string before, string after)
    {
        _ = label;
        _app.Write("logic/Hook.cs", InApp(Hook));
        _app.Write("Program.cs", Program("services.AddTransient<Hook>();", before));

        var result = Port(AppFolder);

        Assert.Equal(Program("services.AddTransient<Hook>();", after), _app.Read("Program.cs"));
        Assert.Contains("Program.cs:12: registered Hook as IOnTaskEndingHandler.", result.Warnings);
        AssertCompilesAgainstV9(AppFolder);
    }

    [Fact]
    public void ARegistrationOfAPackageClass_StaysAsItIs()
    {
        // krt ×13 App/Program.cs:27 services.AddTransient<IProcessEnd, XsdMetadataGenerator>();
        var program = Program("services.AddTransient<IProcessTaskEnd, Dibk.Ftpb.Common.AltinnApps.ProcessTaskEnd>();");
        _app.Write("Program.cs", program);
        _app.Write("logic/Model.cs", InApp("public class Model { }"));

        var result = Port(AppFolder, Package);

        Assert.Empty(result.Messages);
        Assert.Equal(program, _app.Read("Program.cs"));
    }

    [Fact]
    public void AHookTheAppDoesNotRegister_IsPorted_AndSaysV8NeverRanIt()
    {
        // nve/nve-0018 and others have their registration commented out.
        var source = InApp(Hook);
        _app.Write("logic/Hook.cs", source);

        var result = Port(AppFolder);

        Assert.Equal(
            [
                Ported($"logic/Hook.cs:{LineOf(source, "public class Hook")}", "Hook", "IOnTaskEndingHandler"),
                Info($"logic/Hook.cs:{LineOf(source, "public class Hook")}: Hook is not registered; v8 never ran it."),
            ],
            result.Messages
        );
    }
}

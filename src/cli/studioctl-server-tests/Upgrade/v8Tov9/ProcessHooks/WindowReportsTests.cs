using Altinn.Studio.Cli.Upgrade;
using static Studioctl.Tests.Upgrade.v8Tov9.ProcessHooks.StorageCallStubs;

namespace Studioctl.Tests.Upgrade.v8Tov9.ProcessHooks;

/// <summary>
/// What the code a transition runs does besides its Storage client calls: reads of the caller, requests to Storage
/// over HTTP, package members, pre-claim writes and paths the call graph does not follow.
/// </summary>
public sealed class WindowReportsTests : IDisposable
{
    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    private string AppFolder => Path.Combine(_app.Root, "App");

    public static TheoryData<string, string, string, string> Todos =>
        new()
        {
            {
                // brg aarsregnskap ×11 SBS.IsSystem(_authenticationContext.Current).
                "the caller's identity read in a hook (P-IDENTITY until B3)",
                AuthenticationContextRead,
                "logger.LogInformation(\"{Caller}\", authenticationContext.Current);",
                "reads IAuthenticationContext.Current in Hook.End. In v9 the hook runs in the workflow engine's callback, where IAuthenticationContext.Current is the app itself and the HTTP request is the engine's, so the user who moved the process on is not available. This is a gap in the v9 app libraries, not in your code; keep this code until a release closes it, then read who started the transition from the Actor on the context that v9 hooks, service tasks and IInstantiationProcessor.DataCreation(DataCreationContext) get."
            },
            {
                // dibk ×5 HttpContext.User.GetUserIdAsInt().
                "the request's user read in a hook (P-IDENTITY until B3)",
                """
                    public class Hook(Microsoft.AspNetCore.Http.IHttpContextAccessor httpContextAccessor, ILogger<Hook> logger) : IProcessTaskEnd
                    {
                        public Task End(string taskId, Instance instance)
                        {
                            logger.LogInformation("{User}", httpContextAccessor.HttpContext?.User.Identity?.Name);
                            return Task.CompletedTask;
                        }
                    }
                    """,
                "logger.LogInformation(\"{User}\", httpContextAccessor.HttpContext?.User.Identity?.Name);",
                "reads HttpContext.User in Hook.End. In v9 the hook runs in the workflow engine's callback, where IAuthenticationContext.Current is the app itself and the HTTP request is the engine's, so the user who moved the process on is not available. This is a gap in the v9 app libraries, not in your code; keep this code until a release closes it, then read who started the transition from the Actor on the context that v9 hooks, service tasks and IInstantiationProcessor.DataCreation(DataCreationContext) get."
            },
            {
                // digdir/oed-declaration App/logic/CorrespondenceOnSubmission.cs:28,47.
                "the request's user read through a field the constructor set (P-IDENTITY until B3)",
                """
                    public class Hook : IProcessTaskEnd
                    {
                        private readonly Microsoft.AspNetCore.Http.HttpContext _httpContext;
                        private readonly ILogger<Hook> _logger;

                        public Hook(Microsoft.AspNetCore.Http.IHttpContextAccessor httpContextAccessor, ILogger<Hook> logger)
                        {
                            _httpContext = httpContextAccessor.HttpContext!;
                            _logger = logger;
                        }

                        public Task End(string taskId, Instance instance)
                        {
                            _logger.LogInformation("{User}", _httpContext.User.Identity?.Name);
                            return Task.CompletedTask;
                        }
                    }
                    """,
                "_logger.LogInformation(\"{User}\", _httpContext.User.Identity?.Name);",
                "reads _httpContext.User in Hook.End. In v9 the hook runs in the workflow engine's callback, where IAuthenticationContext.Current is the app itself and the HTTP request is the engine's, so the user who moved the process on is not available. This is a gap in the v9 app libraries, not in your code; keep this code until a release closes it, then read who started the transition from the Actor on the context that v9 hooks, service tasks and IInstantiationProcessor.DataCreation(DataCreationContext) get."
            },
            {
                // dat TEST_FLAGG.
                "a request header read in a hook (P-IDENTITY)",
                RequestReads,
                "logger.LogInformation(\"{Flag}\", httpContextAccessor.HttpContext?.Request.Headers[\"TEST_FLAGG\"]);",
                RequestRead("HttpContext.Request")
            },
            {
                // brg's forwarded token.
                "the HttpContext passed on from a hook (P-IDENTITY)",
                RequestReads,
                "Log(httpContextAccessor.HttpContext);",
                RequestRead("HttpContext")
            },
            {
                // brg/rrh-uoverensstemmelser App/logic/Validation/TaskValidator.cs:95.
                "a write in a task validator (P-PRECLAIM)",
                """
                    public class Validator(IDataClient dataClient) : ITaskValidator
                    {
                        public async Task<List<object>> ValidateTask(Instance instance, string taskId, string? language)
                        {
                            var element = instance.Data.First();
                            await dataClient.Update(instance, element);
                            return [];
                        }
                    }
                    """,
                "await dataClient.Update(instance, element);",
                "IDataClient.Update writes to Storage while process/next validates (ITaskValidator.ValidateTask). In v9 that write changes the instance after process/next read it, so the transition answers 409 instanceChanged every time. Move it to the task's IOnTaskEndingHandler (through the mutator) or to a data processor."
            },
            {
                // staf/rapp-advokat-rettshjelp App/logic/CustomDataClient.cs:151.
                "a request to Storage over HTTP (C-XH)",
                """
                    public class Settings { public string ApiStorageEndpoint { get; set; } = ""; }

                    public class CustomDataClient(System.Net.Http.HttpClient client, Settings settings)
                    {
                        public async Task Put(Instance instance)
                        {
                            client.BaseAddress = new Uri(settings.ApiStorageEndpoint);
                            await client.PutAsync($"instances/{instance.Id}/data", new System.Net.Http.StringContent(""));
                        }
                    }

                    public class Hook(CustomDataClient customDataClient) : IProcessTaskEnd
                    {
                        public async Task End(string taskId, Instance instance) => await customDataClient.Put(instance);
                    }
                    """,
                "await client.PutAsync($\"instances/{instance.Id}/data\", new System.Net.Http.StringContent(\"\"));",
                "HttpClient.PutAsync calls Storage over HTTP; use the mutator, with OverrideAuthenticationMethod for a data type that needs the service owner's token."
            },
            {
                // buf/fosterhjem-ep-skjema-person-a App/Custom/Utils/CustomPdfService.cs:62-69.
                "an app replacement of IPdfService (C-XPDF)",
                CustomPdfService,
                "public async Task GenerateAndStorePdf(Instance instance, string taskId, CancellationToken ct)",
                "CustomPdfService.GenerateAndStorePdf replaces the PDF step with IPdfService.GenerateAndStorePdf, which v9 removed. Generate the PDF with a PDF service task in process.bpmn, or call IPdfService.GeneratePdf and add the bytes with dataMutator.AddBinaryDataElement; use those bytes instead of reading the PDF back."
            },
            {
                "a Storage call in an app replacement of IPdfService, which v9 does not call (C-XPDF)",
                CustomPdfService,
                "await dataClient.InsertBinaryData(instance.Id, \"pdf\", \"application/pdf\", \"a.pdf\", new MemoryStream(new byte[] { 1 }));",
                "IDataClient.InsertBinaryData runs in CustomPdfService.GenerateAndStorePdf, which v9 does not call (see "
                    + $"{HookPath}:{LineOf(InApp(CustomPdfService), "public async Task GenerateAndStorePdf")})."
            },
        };

    private const string CustomPdfService = """
        public class CustomPdfService(IDataClient dataClient) : Altinn.App.Core.Internal.Pdf.IPdfService
        {
            public async Task GenerateAndStorePdf(Instance instance, string taskId, CancellationToken ct)
            {
                await dataClient.InsertBinaryData(instance.Id, "pdf", "application/pdf", "a.pdf", new MemoryStream(new byte[] { 1 }));
            }
        }
        """;

    /// <summary>A hook that reads from the request what a callback request has, and what it lacks.</summary>
    private const string RequestReads = """
        public class Hook(Microsoft.AspNetCore.Http.IHttpContextAccessor httpContextAccessor, ILogger<Hook> logger) : IProcessTaskEnd
        {
            public Task End(string taskId, Instance instance)
            {
                logger.LogInformation("{User}", httpContextAccessor.HttpContext?.User.Identity?.Name);
                logger.LogInformation("{Flag}", httpContextAccessor.HttpContext?.Request.Headers["TEST_FLAGG"]);
                Log(httpContextAccessor.HttpContext);
                logger.LogInformation("{Aborted}", httpContextAccessor.HttpContext?.RequestAborted);
                logger.LogInformation("{Services}", httpContextAccessor.HttpContext?.RequestServices);
                logger.LogInformation("{Trace}", httpContextAccessor.HttpContext?.TraceIdentifier);
                return Task.CompletedTask;
            }

            private static void Log(Microsoft.AspNetCore.Http.HttpContext? context) { }
        }
        """;

    private const string AuthenticationContextRead = """
        public class Hook(Altinn.App.Core.Features.Auth.IAuthenticationContext authenticationContext, ILogger<Hook> logger) : IProcessTaskEnd
        {
            public Task End(string taskId, Instance instance)
            {
                logger.LogInformation("{Caller}", authenticationContext.Current);
                return Task.CompletedTask;
            }
        }
        """;

    private static string ReadTheActor(string what) =>
        $"reads {what} in Hook.End. v9 runs the hook in the workflow engine's callback, where "
        + "IAuthenticationContext.Current is the app itself and the HTTP request is the engine's. Instead, read who "
        + "started the transition from the Actor on the context that v9 hooks, service tasks and "
        + "IInstantiationProcessor.DataCreation(DataCreationContext) get: UserId and NationalIdentityNumber for a user, "
        + "OrgId for a service owner, SystemUserId for a system user, AuthenticationLevel for all three, and none of "
        + "them for an organization's Maskinporten token. It does not say whether the user is in Altinn's portal, how "
        + "they logged in, or their token, scopes and parties.";

    private static string RequestRead(string what) =>
        $"reads {what} in Hook.End. v9 runs the hook in the workflow engine's callback request, which has none of the "
        + "caller's cookies, headers, query values or token. Store what the hook needs in the data model before the "
        + "transition, for example in a data processor, and read it from there.";

    [Theory]
    [MemberData(nameof(Todos))]
    public void WhatTheTransitionRunsBesideStorageCalls_IsATodo(string label, string source, string anchor, string text)
    {
        _ = label;
        _app.Write(HookPath, InApp(source));

        var result = Port(AppFolder);

        Assert.Contains(At(source, anchor, UpgradeMessageStatus.Todo, text), result.Messages);
    }

    public static TheoryData<string, string, string, string> Warnings =>
        new()
        {
            {
                // dat/bemanning-soknad App/logic/Validation/TaskValidator.cs:181-197.
                "data values in a task validator (P-PRECLAIM)",
                """
                    public class Validator(IInstanceClient instanceClient) : ITaskValidator
                    {
                        public async Task<List<object>> ValidateTask(Instance instance, string taskId, string? language)
                        {
                            await instanceClient.UpdateDataValue(instance, "validatedVersion", "1");
                            return [];
                        }
                    }
                    """,
                "await instanceClient.UpdateDataValue(instance, \"validatedVersion\", \"1\");",
                "IInstanceClient.UpdateDataValue writes data values while process/next validates (ITaskValidator.ValidateTask). This does not stop the transition (data values do not change the instance's version), but it runs on every validation and outside the transition's checks; set them in the task's IOnTaskEndingHandler with dataMutator.SetDataValue."
            },
            {
                // brg/virksomhetsregistrering TaskEndFlowHelpers.cs:50-51.
                "a Storage client from a service provider (P-UNSEEN)",
                """
                    public class Hook(IServiceProvider services) : IProcessTaskEnd
                    {
                        public Task End(string taskId, Instance instance)
                        {
                            var dataClient = Microsoft.Extensions.DependencyInjection.ServiceProviderServiceExtensions.GetRequiredService<IDataClient>(services);
                            return Task.CompletedTask;
                        }
                    }
                    """,
                "var dataClient = Microsoft.Extensions.DependencyInjection.ServiceProviderServiceExtensions.GetRequiredService<IDataClient>(services);",
                "IDataClient is reachable from Hook.End through a service provider but was not followed (a service locator). If it runs during the transition it fails in v9; use the mutator there."
            },
            {
                // dihe/soknad-bevillinger App/logic/Eformidling/EFormidlingReceivers.cs:109.
                "an eFormidling receivers read (read through dataAccessor)",
                """
                    public class Receivers(IDataClient dataClient) : Altinn.App.Core.EFormidling.Interface.IEFormidlingReceivers
                    {
                        public async Task<List<object>> GetEFormidlingReceivers(Instance instance)
                        {
                            await dataClient.GetFormData(instance, instance.Data.First());
                            return [];
                        }
                    }
                    """,
                "await dataClient.GetFormData(instance, instance.Data.First());",
                "IDataClient.GetFormData reads Storage directly in Receivers.GetEFormidlingReceivers; read through dataAccessor instead."
            },
        };

    [Theory]
    [MemberData(nameof(Warnings))]
    public void WhatTheTransitionRunsBesideStorageCalls_IsAWarning(
        string label,
        string source,
        string anchor,
        string text
    )
    {
        _ = label;
        _app.Write(HookPath, InApp(source));

        var result = Port(AppFolder);

        Assert.Contains(At(source, anchor, UpgradeMessageStatus.Warning, text), result.Messages);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public void APackageMemberThatWrites_FromADataCreation_IsATodoOnlyWithAnAutoCreatedForm(bool autoCreate)
    {
        // ssb/ra0628-01 App/logic/DataProcessing/InstantiationProcessor.cs:36; ssb ×97 have no autoCreate.
        var source = """
            public class Processor(StatisticsNorway.Altinn3.App.Metadata.MetadataUtils metadataUtils) : IInstantiationProcessor
            {
                public async Task DataCreation(Instance instance, object data, Dictionary<string, string>? prefill)
                {
                    await metadataUtils.AddSkjemaInfo(data, instance);
                }
            }
            """;
        _app.Write(HookPath, InApp(source));
        _app.Write(
            MetadataPath,
            $$"""
            {
              "id": "ssb/ra0628-01",
              "dataTypes": [
                {
                  "id": "skjema",
                  "appLogic": {
                    "classRef": "App.Logic.Model",
                    "autoCreate": {{(autoCreate ? "true" : "false")}}
                  }
                }
              ]
            }
            """
        );
        _app.Write(
            "App.csproj",
            """
            <Project Sdk="Microsoft.NET.Sdk.Web">
              <ItemGroup>
                <PackageReference Include="StatisticsNorway.Altinn3.App.Metadata" Version="1.1.0" />
              </ItemGroup>
            </Project>
            """
        );

        var result = Port(AppFolder, Ssb);

        Assert.Equal(
            autoCreate
                ?
                [
                    new UpgradeMessage(
                        "ssb/ra0628-01 calls StatisticsNorway.Altinn3.App.Metadata 1.1.0 MetadataUtils.AddSkjemaInfo from Processor.DataCreation "
                            + $"({HookPath}:{LineOf(InApp(source), "await metadataUtils.AddSkjemaInfo(data, instance);")})"
                            + ". It writes data values and presentation texts with IInstanceClient, which v9 refuses while the process is transitioning. The package owner must add an overload that takes IInstanceDataMutator, or return the values. Until then stop calling AddSkjemaInfo from DataCreation: set InternInfo.skjemaVersjon and InternInfo.raNummer in the model yourself, as AddSkjemaInfo does, and add dataFields for the 7 InternInfo keys and presentationFields periodeFritekst, which derive the same values.",
                        UpgradeMessageStatus.Todo
                    ),
                ]
                : [],
            result.Messages.Where(static message => message.Text.Contains("AddSkjemaInfo", StringComparison.Ordinal))
        );
    }

    public static TheoryData<string, string, string, string> TodosOnceTheLibrariesDescribeTheActor =>
        new()
        {
            {
                "the authentication context, which stays the app",
                AuthenticationContextRead,
                "logger.LogInformation(\"{Caller}\", authenticationContext.Current);",
                ReadTheActor("IAuthenticationContext.Current")
            },
            {
                "the request's user, which stays the engine's",
                RequestReads,
                "logger.LogInformation(\"{User}\", httpContextAccessor.HttpContext?.User.Identity?.Name);",
                ReadTheActor("HttpContext.User")
            },
            {
                "a request header, which no release brings to the callback",
                RequestReads,
                "logger.LogInformation(\"{Flag}\", httpContextAccessor.HttpContext?.Request.Headers[\"TEST_FLAGG\"]);",
                RequestRead("HttpContext.Request")
            },
        };

    [Theory]
    [MemberData(nameof(TodosOnceTheLibrariesDescribeTheActor))]
    public void ACallerRead_OnceTheLibrariesDescribeTheActor_IsATodo(
        string label,
        string source,
        string anchor,
        string text
    )
    {
        _ = label;
        _app.Write(HookPath, InApp(source));

        var result = PortWithCallbackActor(AppFolder);

        Assert.Contains(At(source, anchor, UpgradeMessageStatus.Todo, text), result.Messages);
    }

    [Theory]
    [InlineData("RequestAborted")]
    [InlineData("RequestServices")]
    [InlineData("TraceIdentifier")]
    public void WhatACallbackRequestHasToo_IsNotReported(string member)
    {
        _app.Write(HookPath, InApp(RequestReads));

        var result = Port(AppFolder);

        Assert.DoesNotContain(
            result.Messages,
            message =>
                message.Text.StartsWith(
                    $"{HookPath}:{LineOf(InApp(RequestReads), $"HttpContext?.{member}")}:",
                    StringComparison.Ordinal
                )
        );
    }

    [Fact]
    public void AValidatorThatInheritsAWritingPackageBase_IsATodo()
    {
        // dibk/fa-v3 App/logic/Validator/DataElement/FADataElementValidator.cs:20.
        var source = """
            public class Ferdigattest { }

            public class FADataElementValidator(IDataClient dataClient) : Dibk.Ftpb.Common.AltinnApps.Validator.DataElementValidatorBase<Ferdigattest>(dataClient)
            {
                public override string DataType => "Ferdigattest";
            }
            """;
        _app.Write(HookPath, InApp(source));

        var result = Port(AppFolder, DibkValidator);

        Assert.Contains(
            At(
                source,
                "public class FADataElementValidator",
                UpgradeMessageStatus.Todo,
                "FADataElementValidator derives from Dibk.Ftpb.Common.AltinnApps DataElementValidatorBase, which stores DiBK's validation report as a data element with IDataClient on every validation while process/next validates (IDataElementValidator.ValidateDataElement). In v9 that write changes the instance after process/next read it, so the transition answers 409 instanceChanged every time. The package owner must store the report from an IOnTaskEndingHandler through IInstanceDataMutator, or from a data processor."
            ),
            result.Messages
        );
    }

    [Fact]
    public void APackageMemberThatOnlyReads_IsAWarning()
    {
        // dat/arbeidsdykking-soknad: AT.Common.Altinn.Extensions 4.3.0 GetSkjemaData.
        var source = """
            public class ProcessTaskEnd(IDataClient dataClient) : IProcessTaskEnd
            {
                public async Task End(string taskId, Instance instance)
                {
                    var skjema = await AT.Common.Altinn.Extensions.DataClientExtensions.GetSkjemaData(dataClient, instance);
                }
            }
            """;
        _app.Write(HookPath, InApp(source));

        var result = Port(AppFolder, AtExtensions);

        Assert.Contains(
            new UpgradeMessage(
                "App calls AT.Common.Altinn.Extensions DataClientExtensions.GetSkjemaData from ProcessTaskEnd.End "
                    + $"({HookPath}:{LineOf(InApp(source), "var skjema = await")}). It reads the skjema form with "
                    + "IDataClient.GetFormData, which works while the process is transitioning but bypasses the step's "
                    + "version checks. The package owner can add an overload that takes IInstanceDataAccessor and calls "
                    + "GetFormData.",
                UpgradeMessageStatus.Warning
            ),
            result.Messages
        );
    }

    [Fact]
    public void AnUnknownPackageMemberThatGetsAStorageClient_IsAWarning()
    {
        var source = """
            public class ProcessTaskEnd(Acme.Archive.Archiver archiver) : IProcessTaskEnd
            {
                public async Task End(string taskId, Instance instance)
                {
                    await archiver.Archive(instance);
                }
            }
            """;
        _app.Write(HookPath, InApp(source));

        var result = Port(AppFolder, UnknownPackage);

        Assert.Contains(
            new UpgradeMessage(
                "App calls Acme.Archive Archiver.Archive from ProcessTaskEnd.End "
                    + $"({HookPath}:{LineOf(InApp(source), "await archiver.Archive(instance);")}). It takes IDataClient "
                    + "in its constructor or as a parameter; check that it does not write to Storage during the transition.",
                UpgradeMessageStatus.Warning
            ),
            result.Messages
        );
    }
}

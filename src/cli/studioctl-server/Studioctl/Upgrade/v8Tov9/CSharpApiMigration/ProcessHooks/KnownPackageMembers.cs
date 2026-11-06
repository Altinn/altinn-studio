using Microsoft.CodeAnalysis;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration.ProcessHooks;

/// <summary>
/// A service owner's package member that reaches Storage from code the process transition runs, as the 2026-10-20
/// fleet survey read it in the decompiled packages: what it does, and what its owner must change.
/// </summary>
/// <param name="Package">The package id, as reports name it.</param>
/// <param name="Assembly">The name of the package's assembly, which is not always the package id.</param>
/// <param name="Type">The type's full name without generic arity.</param>
/// <param name="Member">The member called, or <c>null</c> for a hook type the app registers.</param>
/// <param name="Writes">Whether it writes; a member that only reads works while the process is transitioning.</param>
/// <param name="Workaround">What the app can do until the package changes; <c>null</c> when nothing.</param>
/// <param name="AtProcessEnd">What its process-end hook writes to the app's forms, which v9 refuses for a bound form.</param>
internal sealed record KnownPackageMember(
    string Package,
    string Assembly,
    Version From,
    Version To,
    string Type,
    string? Member,
    bool Writes,
    string Does,
    string Change,
    string? Workaround,
    ProcessEndFormWrite? AtProcessEnd = null
)
{
    public bool Matches(IAssemblySymbol assembly, ITypeSymbol type, string? member) =>
        string.Equals(assembly.Name, Assembly, StringComparison.Ordinal)
        && FullName(type) == Type
        && (Member is null || string.Equals(member, Member, StringComparison.Ordinal))
        && Version(assembly) is { } version
        && version >= From
        && version <= To;

    /// <summary>
    /// The package version the assembly was built as: its informational version without prerelease or build metadata,
    /// which packages set to the package version, else Major.Minor.Build of its assembly version (some packages keep
    /// that at 0.0.1).
    /// </summary>
    public static Version? Version(IAssemblySymbol assembly)
    {
        var informational =
            assembly
                .GetAttributes()
                .FirstOrDefault(static attribute =>
                    attribute.AttributeClass?.Name == "AssemblyInformationalVersionAttribute"
                )
                ?.ConstructorArguments.FirstOrDefault()
                .Value as string;
        if (informational?.Split('+')[0].Split('-')[0] is { } text && System.Version.TryParse(text, out var parsed))
        {
            return new Version(parsed.Major, parsed.Minor, Math.Max(parsed.Build, 0));
        }

        return assembly.Identity.Version is { } version
            ? new Version(version.Major, version.Minor, Math.Max(version.Build, 0))
            : null;
    }

    public static string FullName(ITypeSymbol type)
    {
        var name = type.OriginalDefinition.ToDisplayString(SymbolDisplayFormat.FullyQualifiedFormat)[
            "global::".Length..
        ];
        var generic = name.IndexOf('<', StringComparison.Ordinal);
        return generic < 0 ? name : name[..generic];
    }
}

/// <summary>The package members the fleet reaches Storage through, and the package helpers that name the instance.</summary>
internal static class KnownPackageMembers
{
    private const string Ssb = "StatisticsNorway.Altinn3.App.Metadata";
    private const string Arbeidstilsynet = "Arbeidstilsynet.Common.AltinnApp";
    private const string AtExtensions = "AT.Common.Altinn.Extensions";

    private const string ArbeidstilsynetDoes =
        "reads, adds and deletes data elements and writes data values with IDataClient and IInstanceClient, and registers "
        + "IProcessTaskEnd and IProcessEnd handlers";

    private const string ArbeidstilsynetChange = "port it to the v9 handlers and IInstanceDataMutator";

    public static readonly IReadOnlyList<KnownPackageMember> All =
    [
        new(
            Ssb,
            "Altinn3.App.Metadata",
            new Version(1, 0, 1),
            new Version(1, 2, 1),
            "StatisticsNorway.Altinn3.App.Metadata.MetadataUtils",
            "AddSkjemaInfo",
            Writes: true,
            "writes data values and presentation texts with IInstanceClient",
            "add an overload that takes IInstanceDataMutator, or return the values",
            "stop calling AddSkjemaInfo from DataCreation: set InternInfo.skjemaVersjon and InternInfo.raNummer in the model "
                + "yourself, as AddSkjemaInfo does, and add dataFields for the 7 InternInfo keys and presentationFields "
                + "periodeFritekst, which derive the same values"
        ),
        new(
            "Ft.Datafangst.Utils",
            "Utils",
            new Version(2, 1, 4),
            new Version(2, 1, 4),
            "Ft.Datafangst.Utils.Application.XsdMetadataGenerator",
            null,
            Writes: true,
            "sets element metadata with IDataClient.Update",
            "set the metadata with dataMutator.UpdateDataElementMetadata in an IOnTaskEndingHandler of the forms' task",
            null,
            new ProcessEndFormWrite(
                "XsdMetadataGenerator.End",
                "updates {forms} at process end, when there is no current task",
                "Set the metadata at the end of {tasks} instead."
            )
        ),
        new(
            Arbeidstilsynet,
            "AT.Common.AltinnApp.Publish",
            new Version(2, 4, 1),
            new Version(2, 9, 0),
            "Arbeidstilsynet.Common.AltinnApp.Implementation.StructuredDataManager",
            null,
            Writes: true,
            ArbeidstilsynetDoes,
            ArbeidstilsynetChange,
            null,
            new ProcessEndFormWrite(
                "StructuredDataManager.End",
                "deletes {forms} at process end",
                "Set autoDeleteOnProcessEnd on {forms} and KeepAppDataModelAfterMapping = true so v9 deletes it instead."
            )
        ),
        new(
            Arbeidstilsynet,
            "AT.Common.AltinnApp.Publish",
            new Version(2, 4, 1),
            new Version(2, 9, 0),
            "Arbeidstilsynet.Common.AltinnApp.Abstract.Processing.PreSubmitDataModelProcessor",
            null,
            Writes: true,
            ArbeidstilsynetDoes,
            ArbeidstilsynetChange,
            null
        ),
        new(
            Arbeidstilsynet,
            "AT.Common.AltinnApp.Publish",
            new Version(2, 4, 1),
            new Version(2, 9, 0),
            "Arbeidstilsynet.Common.AltinnApp.Implementation.UpdateDialogTask",
            null,
            Writes: true,
            ArbeidstilsynetDoes,
            ArbeidstilsynetChange,
            null
        ),
        new(
            AtExtensions,
            AtExtensions,
            new Version(4, 3, 0),
            new Version(4, 3, 0),
            "AT.Common.Altinn.Extensions.DataClientExtensions",
            "DeleteElement",
            Writes: true,
            "deletes the data element with IDataClient.DeleteData",
            "add an overload that takes IInstanceDataMutator and calls RemoveDataElement",
            "call dataMutator.RemoveDataElement(element) instead"
        ),
        new(
            AtExtensions,
            AtExtensions,
            new Version(4, 3, 0),
            new Version(4, 3, 0),
            "AT.Common.Altinn.Extensions.DataClientExtensions",
            "GetSkjemaData",
            Writes: false,
            "reads the skjema form with IDataClient.GetFormData",
            "add an overload that takes IInstanceDataAccessor and calls GetFormData",
            null
        ),
        new(
            "PsA3Forms",
            "PsA3Forms",
            new Version(6, 5, 0),
            new Version(6, 5, int.MaxValue),
            "PsA3Forms.Clients.AttachmentTagClient",
            "SetTag",
            Writes: true,
            "replaces the element's tags with IDataClient.Update",
            "remove the obsolete member; use InstanceExtensions.AddTagToAttachments and dataMutator.UpdateDataElementMetadata",
            "call InstanceExtensions.AddTagToAttachments and save the returned elements' tags with "
                + "dataMutator.UpdateDataElementMetadata"
        ),
        new(
            "Dibk.Ftpb.Altinn.Pdf",
            "Dibk.Ftpb.Altinn.Pdf",
            new Version(0, 3, 0),
            new Version(0, 3, 0),
            "Dibk.Ftpb.Altinn.Pdf.PdfService",
            "CreatePdfAsync",
            Writes: false,
            "reads the form XML with IDataClient.GetBinaryData",
            "accept the XML bytes, which the app reads with dataMutator.GetBinaryData",
            null
        ),
        new(
            "Dibk.Ftpb.Altinn.Pdf",
            "Dibk.Ftpb.Altinn.Pdf",
            new Version(0, 3, 0),
            new Version(0, 3, 0),
            "Dibk.Ftpb.Altinn.Pdf.IPdfService",
            "CreatePdfAsync",
            Writes: false,
            "reads the form XML with IDataClient.GetBinaryData",
            "accept the XML bytes, which the app reads with dataMutator.GetBinaryData",
            null
        ),
        new(
            "PsA3Forms",
            "PsA3Forms",
            new Version(6, 5, 0),
            new Version(6, 5, int.MaxValue),
            "PsA3Forms.Clients.IAttachmentTagClient",
            "SetTag",
            Writes: true,
            "replaces the element's tags with IDataClient.Update",
            "remove the obsolete member; use InstanceExtensions.AddTagToAttachments and dataMutator.UpdateDataElementMetadata",
            "call InstanceExtensions.AddTagToAttachments and save the returned elements' tags with "
                + "dataMutator.UpdateDataElementMetadata"
        ),
        new(
            "Dibk.Ftpb.Common.AltinnApps",
            "Dibk.Ftpb.Common.AltinnApps",
            new Version(1, 2, 0),
            new Version(1, 7, int.MaxValue),
            "Dibk.Ftpb.Common.AltinnApps.Validator.DataElementValidatorBase",
            null,
            Writes: true,
            "stores DiBK's validation report as a data element with IDataClient on every validation",
            "store the report from an IOnTaskEndingHandler through IInstanceDataMutator, or from a data processor",
            null
        ),
    ];

    /// <summary>The known member <paramref name="method"/> is, or the one its type is, when it is one.</summary>
    public static KnownPackageMember? Find(IMethodSymbol method)
    {
        var member = method.ReducedFrom ?? method;
        return All.FirstOrDefault(known =>
            member.ContainingAssembly is { } assembly && known.Matches(assembly, member.ContainingType, member.Name)
        );
    }

    /// <summary>The known package hook type <paramref name="type"/> is, if any.</summary>
    public static KnownPackageMember? FindType(ITypeSymbol type) =>
        type.ContainingAssembly is { } assembly
            ? All.FirstOrDefault(known => known.Member is null && known.Matches(assembly, type, null))
            : null;

    /// <summary>
    /// A package extension method on <c>Instance</c> that returns one of its data elements, as its decompiled source
    /// reads (Dibk.Ftpb.Common.AltinnClient 1.1.3-1.1.4 <c>InstanceExtension.DataElementByType</c>:
    /// <c>instance.Data.FirstOrDefault(d =&gt; d.DataType == dataType)</c>).
    /// </summary>
    public static bool IsElementHelper(IMethodSymbol method)
    {
        var member = method.ReducedFrom ?? method;
        return member
                is { Name: "DataElementByType", ContainingAssembly: { Name: "Dibk.Ftpb.Common.AltinnClient" } assembly }
            && KnownPackageMember.FullName(member.ContainingType) == "Dibk.Ftpb.Common.AltinnClient.InstanceExtension"
            && KnownPackageMember.Version(assembly) is { Major: 1, Minor: 1, Build: >= 3 and <= 4 };
    }

    /// <summary>
    /// Package extension methods on <c>Instance</c> that return a part of its id, as their
    /// decompiled source reads (AT.Common.Altinn.Extensions 4.3.0 <c>InstanceExtensions.cs:8-21</c>).
    /// </summary>
    public static InstancePart? IdentityHelper(IMethodSymbol method)
    {
        var member = method.ReducedFrom ?? method;
        if (
            member.ContainingAssembly is not { Name: AtExtensions } assembly
            || KnownPackageMember.Version(assembly) != new Version(4, 3, 0)
            || KnownPackageMember.FullName(member.ContainingType) != "AT.Common.Altinn.Extensions.InstanceExtensions"
        )
        {
            return null;
        }

        return member.Name switch
        {
            "GetInstanceGuid" => InstancePart.Guid,
            "GetInstanceOwnerPartyId" => InstancePart.PartyId,
            _ => null,
        };
    }
}

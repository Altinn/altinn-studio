using System.Diagnostics.CodeAnalysis;
using System.Reflection;
using System.Xml;
using System.Xml.Schema;

namespace Altinn.App.Clients.Fiks.Tests;

/// <summary>
/// Borrowed from <see href="https://github.com/ks-no/fiks-protokoll-validator/blob/main/api/KS.FiksProtokollValidator.WebAPI/TjenerValidator/Validation/XsdValidator.cs" />
/// </summary>
public class XsdValidator
{
    private XmlSchemaSet _xmlSchemaSet;
    private XmlReaderSettings _xmlReaderSettings;

    public XsdValidator()
    {
        InitXmlSchemaSets();
    }

    [MemberNotNull(nameof(_xmlReaderSettings), nameof(_xmlSchemaSet))]
    private void InitXmlSchemaSets()
    {
        _xmlSchemaSet = new XmlSchemaSet();
        _xmlReaderSettings = new XmlReaderSettings();

        var arkivModelsAssembly =
            Assembly
                .GetExecutingAssembly()
                .GetReferencedAssemblies()
                .Select(a => Assembly.Load(a.FullName))
                .SingleOrDefault(assembly => assembly.GetName().Name == "KS.Fiks.Arkiv.Models.V1")
            ?? throw new InvalidOperationException("Error loading KS.Fiks.Arkiv.Models.V1 assembly");

        var schemas = new List<(string, string)>
        {
            (
                "KS.Fiks.Arkiv.Models.V1.Schema.V1.no.ks.fiks.arkiv.v1.arkivering.arkivmelding.opprett.xsd",
                "https://ks-no.github.io/standarder/fiks-protokoll/fiks-arkiv/arkivmelding/opprett/v1"
            ),
            (
                "KS.Fiks.Arkiv.Models.V1.Schema.V1.no.ks.fiks.arkiv.v1.arkivering.arkivmelding.oppdater.xsd",
                "https://ks-no.github.io/standarder/fiks-protokoll/fiks-arkiv/arkivmelding/oppdater/v1"
            ),
            (
                "KS.Fiks.Arkiv.Models.V1.Schema.V1.no.ks.fiks.arkiv.v1.arkivering.avskrivning.opprett.xsd",
                "https://ks-no.github.io/standarder/fiks-protokoll/fiks-arkiv/avskrivning/opprett/v1"
            ),
            (
                "KS.Fiks.Arkiv.Models.V1.Schema.V1.no.ks.fiks.arkiv.v1.arkivering.avskrivning.slett.xsd",
                "https://ks-no.github.io/standarder/fiks-protokoll/fiks-arkiv/avskrivning/slett/v1"
            ),
            (
                "KS.Fiks.Arkiv.Models.V1.Schema.V1.no.ks.fiks.arkiv.v1.arkivering.dokumentobjekt.opprett.xsd",
                "https://ks-no.github.io/standarder/fiks-protokoll/fiks-arkiv/dokumentobjekt/opprett/v1"
            ),
            (
                "KS.Fiks.Arkiv.Models.V1.Schema.V1.metadatakatalog.xsd",
                "https://ks-no.github.io/standarder/fiks-protokoll/fiks-arkiv/metadatakatalog/v1"
            ),
            (
                "KS.Fiks.Arkiv.Models.V1.Schema.V1.no.ks.fiks.arkiv.v1.innsyn.sok.xsd",
                "https://ks-no.github.io/standarder/fiks-protokoll/fiks-arkiv/sok/v1"
            ),
            (
                "KS.Fiks.Arkiv.Models.V1.Schema.V1.no.ks.fiks.arkiv.v1.innsyn.sok.resultat.minimum.xsd",
                "https://ks-no.github.io/standarder/fiks-protokoll/fiks-arkiv/sokeresultat/minimum/v1"
            ),
            (
                "KS.Fiks.Arkiv.Models.V1.Schema.V1.arkivstrukturMinimum.xsd",
                "https://ks-no.github.io/standarder/fiks-protokoll/fiks-arkiv/arkivstruktur/minimum/v1"
            ),
            (
                "KS.Fiks.Arkiv.Models.V1.Schema.V1.no.ks.fiks.arkiv.v1.innsyn.sok.resultat.noekler.xsd",
                "https://ks-no.github.io/standarder/fiks-protokoll/fiks-arkiv/sokeresultat/noekler/v1"
            ),
            (
                "KS.Fiks.Arkiv.Models.V1.Schema.V1.arkivstrukturNoekler.xsd",
                "https://ks-no.github.io/standarder/fiks-protokoll/fiks-arkiv/arkivstruktur/noekler/v1"
            ),
            (
                "KS.Fiks.Arkiv.Models.V1.Schema.V1.no.ks.fiks.arkiv.v1.innsyn.sok.resultat.utvidet.xsd",
                "https://ks-no.github.io/standarder/fiks-protokoll/fiks-arkiv/sokeresultat/utvidet/v1"
            ),
            (
                "KS.Fiks.Arkiv.Models.V1.Schema.V1.arkivstruktur.xsd",
                "https://ks-no.github.io/standarder/fiks-protokoll/fiks-arkiv/arkivstruktur/v1"
            ),
            (
                "KS.Fiks.Arkiv.Models.V1.Schema.V1.no.ks.fiks.arkiv.v1.innsyn.registrering.hent.xsd",
                "https://ks-no.github.io/standarder/fiks-protokoll/fiks-arkiv/registrering/hent/v1"
            ),
            (
                "KS.Fiks.Arkiv.Models.V1.Schema.V1.no.ks.fiks.arkiv.v1.innsyn.registrering.hent.resultat.xsd",
                "https://ks-no.github.io/standarder/fiks-protokoll/fiks-arkiv/registrering/hent/resultat/v1"
            ),
            (
                "KS.Fiks.Arkiv.Models.V1.Schema.V1.no.ks.fiks.arkiv.v1.innsyn.mappe.hent.xsd",
                "https://ks-no.github.io/standarder/fiks-protokoll/fiks-arkiv/mappe/hent/v1"
            ),
            (
                "KS.Fiks.Arkiv.Models.V1.Schema.V1.no.ks.fiks.arkiv.v1.innsyn.mappe.hent.resultat.xsd",
                "https://ks-no.github.io/standarder/fiks-protokoll/fiks-arkiv/mappe/hent/resultat/v1"
            ),
            (
                "KS.Fiks.Arkiv.Models.V1.Schema.V1.no.ks.fiks.arkiv.v1.innsyn.dokumentfil.hent.xsd",
                "https://ks-no.github.io/standarder/fiks-protokoll/fiks-arkiv/dokumentfil/hent/v1"
            ),
        };

        foreach (var schema in schemas)
        {
            using var schemaStream =
                arkivModelsAssembly.GetManifestResourceStream(schema.Item1)
                ?? throw new InvalidOperationException("Error retrieving arkivmelding.opprett.xsd definition");

            using var schemaReader = XmlReader.Create(schemaStream);

            _xmlSchemaSet.Add(schema.Item2, schemaReader);
        }

        _xmlReaderSettings.Schemas.Add(_xmlSchemaSet);
    }

    public ValidationHandler Validate(string payload)
    {
        var validationHandler = new ValidationHandler();
        _xmlReaderSettings.ValidationType = ValidationType.Schema;
        _xmlReaderSettings.ValidationEventHandler += validationHandler.HandleValidationError;

        var xmlReader = XmlReader.Create(new StringReader(payload), _xmlReaderSettings);

        try
        {
            while (xmlReader.Read()) { }
        }
        catch (Exception e)
        {
            validationHandler.Errors.Add($"Validating the xml failed. {e.Message}");
        }

        return validationHandler;
    }
}

public class ValidationHandler
{
    public readonly List<string> Warnings = [];
    public readonly List<string> Errors = [];

    public void HandleValidationError(object? sender, ValidationEventArgs e)
    {
        switch (e.Severity)
        {
            case XmlSeverityType.Warning:
                Warnings.Add(e.Message);
                break;
            case XmlSeverityType.Error:
                Errors.Add(e.Message);
                break;
            default:
                Warnings.Add(e.Message);
                break;
        }
    }

    public bool HasErrors() => Errors.Count > 0;

    public bool HasWarnings() => Warnings.Count > 0;
}

using System.Text.Json;
using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.Expressions;
using Altinn.App.Core.Tests.LayoutExpressions.TestUtilities;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Tests.LayoutExpressions.FullTests.RemoveHiddenData;

public class RemoveHiddenDataTests
{
    [Fact]
    public async Task TestRemoveHiddenData()
    {
        using var jsonDoc = JsonDocument.Parse(
            """
            {
                "root": {
                    "fornavn": null,
                    "etternavn": null,
                    "alder": null,
                    "arbeidserfaring": [
                        {
                            "altinnRowId": "7bca5a19-8654-4e9d-a7d5-1b12f670b1aa",
                            "arbeidsgiver": "Digitaliseringsdirektoratet",
                            "fra": "2020-01-01",
                            "til": "2020-12-31",
                            "stilling": "GyldigUtvikler",
                            "beskrivelse": "Jobbet med Altinn Studio",
                            "prosjekter": [
                                {
                                    "altinnRowId": "00351338-13af-4084-9532-e41cb96262ec",
                                    "tittel": "GyldigProsjekt",
                                    "beskrivelse": "Laget Altinn Studio"
                                },
                                {
                                    "altinnRowId": "a38766c8-635e-41e8-9b2b-274af49092dc",
                                    "tittel": "UgyldigProsjekt",
                                    "beskrivelse": "kult"
                                },
                                {
                                    "altinnRowId": "c21976e3-ac06-41a7-bb00-c61822d0b1f8",
                                    "tittel": "GyldigProsjekt",
                                    "beskrivelse": "Laget Altinn Studio"
                                },
                                {
                                    "altinnRowId": "21fe3c90-aa74-4bda-a6fb-3927a98cfb4d",
                                    "tittel": "UgyldigProsjekt",
                                    "beskrivelse": "kult"
                                }
                            ],
                            "vedlegg": [
                                "ce83fcaf-bdc5-4be2-aa28-0551cea31119"
                            ]
                        },
                        {
                            "altinnRowId": "554b961b-f8f7-40a2-b700-27d1832b8c39",
                            "arbeidsgiver": "Digitaliseringsdirektoratet",
                            "fra": "2020-01-01",
                            "til": "2020-12-31",
                            "stilling": "UgyldigUtvikler",
                            "beskrivelse": "flink",
                            "prosjekter": [
                                {
                                    "altinnRowId": "8c0f9db5-642c-4456-804c-e327666fa30b",
                                    "tittel": "UgyldigProsjekt",
                                    "beskrivelse": "kult"
                                },
                                {
                                    "altinnRowId": "8c539f35-a095-408c-8dda-ca50e1be5c7b",
                                    "tittel": "GyldigProsjekt",
                                    "beskrivelse": "Laget Altinn Studio"
                                },
                                {
                                    "altinnRowId": "d5193bf9-b594-42ae-a577-b02d23a3ee75",
                                    "tittel": "ErrorProsjekt",
                                    "beskrivelse": "kult"
                                },
                                {
                                    "altinnRowId": "fdfbe892-2d2c-45f1-b260-28415b3e0407",
                                    "tittel": "UgyldigProsjekt",
                                    "beskrivelse": "kult"
                                }
                            ],
                            "vedlegg": [
                                "7d16376c-68c5-4de8-b44e-b2da64d1617e"
                            ]
                        },
                        {
                            "altinnRowId": "4bef4f3a-506d-4f70-a652-a75500bd5621",
                            "arbeidsgiver": "Digitaliseringsdirektoratet",
                            "fra": "2020-01-01",
                            "til": "2020-12-31",
                            "stilling": "UgyldigUtvikler",
                            "beskrivelse": "flink",
                            "prosjekter": [],
                            "vedlegg": [
                                "a97d8c01-781e-4fb5-a66d-03174d529209"
                            ]
                        }
                    ],
                    "epost": null,
                    "telefonnummer": null,
                    "bosted": null,
                    "kjonn": null,
                    "SF_skjul-felter": "fornavn,etternavn,alder,kjonn,epost,telefon,bosted",
                    "SF_skjul-arbeidsgiver": "UgyldigUtvikler",
                    "SF_skjul-prosjekt": "UgyldigProsjekt",
                    "vedlegg": []
                }
            }
            """
        );
        IInstanceDataAccessor dataAccessor = DynamicClassBuilder.DataAccessorFromJsonDocument(
            new Instance(),
            jsonDoc.RootElement
        );
        var data = await dataAccessor.GetFormData(dataAccessor.Instance.Data.First());
        var state = await LayoutTestUtils.GetLayoutModelTools(data, "RemoveHiddenData");
        var hidden = await LayoutEvaluator.GetHiddenFieldsForRemoval(state);

        await Verify(hidden);
    }
}

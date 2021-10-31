/* eslint-disable no-useless-escape */
/* eslint-disable no-tabs */
const mockString = `
{
	"$schema" : "http://json-schema.org/schema#",
	"$id" : "schema.json",
	"type" : "object",
	"properties" : {
			"melding" : {
					"$ref" : "#/definitions/RA-0678_M"
				}
		},
	"info" : {
			"XSLT-skriptnavn" : "SERES_XSD_GEN",
			"XSD-generatorversjon" : "2.0.13",
			"XSLT-prosessor" : "SAXON versjon 9.1.0.7",
			"generert" : "2015-05-06T09:50:22.327+02:00",
			"navneromprefix" : "http://seres.no/xsd",
			"namespace" : "http://seres.no/xsd/StatistiskSentralbyrå/RA-0678_M/2015",
			"meldingsnavn" : "melding",
			"domenenavn" : "StatistiskSentralbyrå",
			"modellnavn" : "RA-0678_M",
			"metamodellversjon" : "1.2",
			"guid" : "true",
			"orid" : "false",
			"nillable" : "true",
			"tillat-gjenbruk" : "true",
			"elementtype" : "true",
			"forvaltningsdata" : "true",
			"forvaltningsdata-navnerom" : "http://seres.no/xsd/forvaltningsdata",
			"særnorske-bokstaver-i-navn" : "false",
			"ft_guid_som_attributt" : "false",
			"sem-ref" : "false",
			"kodebibliotek" : "false",
			"språk" : "",
			"XSD-variant" : "Altinn",
			"XSD-transformatorversjon" : "1.2"
		},
	"definitions" : {
			"RA-0678_M" : {
					"type": "object",
					"properties" : {
							"dataFormatProvider" : {
									"const" : "SERES",
									"type" : "string",
									"@xsdType" : "XmlAttribute"
								},
							"dataFormatId" : {
									"const" : "4664",
									"type" : "string",
									"@xsdType" : "XmlAttribute"
								},
							"dataFormatVersion" : {
									"const" : "38916",
									"type" : "string",
									"@xsdType" : "XmlAttribute"
								},
							"InternInformasjon" : {
									"$ref" : "#/definitions/InternInformasjon",
									"@xsdUnhandledAttribute1" : "seres:elementtype=Meldingsdel",
									"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Meldingsdel/InternInformasjon/479039"
								},
							"KontaktpersonOgKommentarfelt" : {
									"$ref" : "#/definitions/KontaktpersonOgKommentarfelt",
									"@xsdUnhandledAttribute1" : "seres:elementtype=Meldingsdel",
									"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Meldingsdel/KontaktpersonOgKommentarfelt/487843"
								},
							"ForetakOgVirksomhetsopplysninger" : {
									"$ref" : "#/definitions/ForetakOgVirksomhetsopplysninger",
									"@xsdUnhandledAttribute1" : "seres:elementtype=Meldingsdel",
									"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Meldingsdel/ForetakOgVirksomhetsopplysninger/492169"
								},
							"StatusVirksomhetMedDriftsperiode" : {
									"$ref" : "#/definitions/StatusVirksomhetMedDriftsperiode",
									"@xsdUnhandledAttribute1" : "seres:elementtype=Meldingsdel",
									"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Meldingsdel/StatusVirksomhetMedDriftsperiode/526334"
								},
							"Naeringskontrollspoersmaal" : {
									"$ref" : "#/definitions/Naeringskontrollspoersmaal",
									"@xsdUnhandledAttribute1" : "seres:elementtype=Meldingsdel",
									"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Meldingsdel/Næringskontroll/526331"
								},
							"Oppgavebyrde" : {
									"$ref" : "#/definitions/Oppgavebyrde",
									"@xsdUnhandledAttribute1" : "seres:elementtype=Meldingsdel",
									"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Meldingsdel/Oppgavebyrde/492705"
								},
							"Skjemadata" : {
									"$ref" : "#/definitions/Skjemadata",
									"@xsdUnhandledAttribute1" : "seres:elementtype=Meldingsdel",
									"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Meldingsdel/Skjemadata/600884"
								}
						},
					"required" : [
							"dataFormatProvider",
							"dataFormatId",
							"dataFormatVersion",
							"InternInformasjon",
							"KontaktpersonOgKommentarfelt",
							"ForetakOgVirksomhetsopplysninger",
							"StatusVirksomhetMedDriftsperiode",
							"Naeringskontrollspoersmaal",
							"Oppgavebyrde",
							"Skjemadata"
						],
					"@xsdAnyAttribute" : true,
					"@xsdUnhandledAttribute1" : "seres:elementtype=Meldingsmodell",
					"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Meldingsmodell/RA-0678_M/600886"
				},
			"InternInformasjon" : {
					"properties" : {
							"periodeFritekst" : {
									"$ref" : "#/definitions/Tekst_50",
									"@xsdUnhandledAttribute1" : "seres:elementtype=Dataegenskap",
									"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Dataegenskap/periode/479038"
								},
							"rapportPeriode" : {
									"$ref" : "#/definitions/Tidsrom",
									"@xsdUnhandledAttribute1" : "seres:elementtype=Dataegenskap",
									"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Dataegenskap/rapportPeriode/479037"
								},
							"raNummer" : {
									"$ref" : "#/definitions/Tekst",
									"@xsdUnhandledAttribute1" : "seres:elementtype=Dataegenskap",
									"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Dataegenskap/raNummer/479036"
								},
							"delRegNummer" : {
									"$ref" : "#/definitions/Tekst",
									"@xsdUnhandledAttribute1" : "seres:elementtype=Dataegenskap",
									"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Dataegenskap/delRegNummer/479035"
								},
							"identnummerEnhet" : {
									"$ref" : "#/definitions/Tekst_30",
									"@xsdUnhandledAttribute1" : "seres:elementtype=Dataegenskap",
									"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Dataegenskap/enhetsIdentNummer/492113"
								},
							"sendtFraSluttbrukersystem" : {
									"$ref" : "#/definitions/Tekst_09",
									"@xsdUnhandledAttribute1" : "seres:elementtype=Dataegenskap",
									"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Dataegenskap/sendtFraSluttbrukersystem/555500"
								},
							"statistiskEnhet" : {
									"$ref" : "#/definitions/StatistiskEnhet",
									"@xsdUnhandledAttribute1" : "seres:elementtype=Relasjonsegenskap",
									"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Relasjonsegenskap/statistiskEnhet/569286"
								}
						},
					"required" : [
							"raNummer"
						],
					"@xsdUnhandledAttribute1" : "seres:elementtype=Meldingsdel",
					"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Meldingsdel/InternInformasjon/479039"
				},
			"Tidsrom" : {
					"properties" : {
							"fomDato" : {
									"$ref" : "#/definitions/Dato",
									"@xsdUnhandledAttribute1" : "seres:elementtype=DataTypeegenskap",
									"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/DataTypeegenskap/fomDato/476090"
								},
							"tomDato" : {
									"$ref" : "#/definitions/Dato",
									"@xsdUnhandledAttribute1" : "seres:elementtype=DataTypeegenskap",
									"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/DataTypeegenskap/tomDato/476089"
								}
						},
					"@xsdUnhandledAttribute1" : "seres:elementtype=Datakomplekstype",
					"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Datakomplekstype/Tidsrom/476091"
				},
			"StatistiskEnhet" : {
					"properties" : {
							"enhetsident" : {
									"$ref" : "#/definitions/Tekst_50",
									"@xsdUnhandledAttribute1" : "seres:elementtype=Dataegenskap",
									"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Dataegenskap/enhetsident/569284"
								},
							"enhetstype" : {
									"$ref" : "#/definitions/StatistiskeEnhetstyper",
									"@xsdUnhandledAttribute1" : "seres:elementtype=Dataegenskap",
									"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Dataegenskap/enhetstype/569283"
								}
						},
					"@xsdUnhandledAttribute1" : "seres:elementtype=Dataobjekttype",
					"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Dataobjekttype/StatistiskEnhet/569285"
				},
			"KontaktpersonOgKommentarfelt" : {
					"properties" : {
							"kommentar" : {
									"$ref" : "#/definitions/Kommentar",
									"@xsdUnhandledAttribute1" : "seres:elementtype=Dataegenskap",
									"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Dataegenskap/kommentar/487842"
								},
							"kontaktperson" : {
									"$ref" : "#/definitions/Kontaktperson",
									"@xsdUnhandledAttribute1" : "seres:elementtype=Relasjonsegenskap",
									"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Relasjonsegenskap/kontaktperson/487841"
								}
						},
					"@xsdUnhandledAttribute1" : "seres:elementtype=Meldingsdel",
					"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Meldingsdel/KontaktpersonOgKommentarfelt/487843"
				},
			"Kontaktperson" : {
					"properties" : {
							"epostadresse" : {
									"$ref" : "#/definitions/Epost",
									"@xsdUnhandledAttribute1" : "seres:elementtype=Dataegenskap",
									"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Dataegenskap/epostadresse/476085"
								},
							"navn" : {
									"$ref" : "#/definitions/NavnSomToken",
									"@xsdUnhandledAttribute1" : "seres:elementtype=Dataegenskap",
									"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Dataegenskap/navn/489943"
								},
							"telefonSFU" : {
									"$ref" : "#/definitions/Tekst_25",
									"@xsdUnhandledAttribute1" : "seres:elementtype=Dataegenskap",
									"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Dataegenskap/telefonSFU/566757"
								}
						},
					"@xsdUnhandledAttribute1" : "seres:elementtype=Dataobjekttype",
					"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Dataobjekttype/Kontaktperson/476088"
				},
			"ForetakOgVirksomhetsopplysninger" : {
					"properties" : {
							"organisasjonsnummerKontekst" : {
									"$ref" : "#/definitions/Organisasjonsnummer",
									"@xsdUnhandledAttribute1" : "seres:elementtype=Dataegenskap",
									"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Dataegenskap/organisasjonsnummerKontekst/492166"
								},
							"foretak" : {
									"$ref" : "#/definitions/Foretak",
									"@xsdUnhandledAttribute1" : "seres:elementtype=Relasjonsegenskap",
									"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Relasjonsegenskap/foretak/492168"
								},
							"virksomhet" : {
									"$ref" : "#/definitions/Virksomhet",
									"@xsdUnhandledAttribute1" : "seres:elementtype=Relasjonsegenskap",
									"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Relasjonsegenskap/virksomhet/492167"
								}
						},
					"@xsdUnhandledAttribute1" : "seres:elementtype=Meldingsdel",
					"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Meldingsdel/ForetakOgVirksomhetsopplysninger/492169"
				},
			"Foretak" : {
					"properties" : {
							"organisasjonsnummerForetak" : {
									"$ref" : "#/definitions/Organisasjonsnummer",
									"@xsdUnhandledAttribute1" : "seres:elementtype=Dataegenskap",
									"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Dataegenskap/organisasjonsnummerForetak/492156"
								},
							"navnForetak" : {
									"$ref" : "#/definitions/Tekst",
									"@xsdUnhandledAttribute1" : "seres:elementtype=Dataegenskap",
									"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Dataegenskap/navnForetak/492155"
								},
							"adresseForetak" : {
									"$ref" : "#/definitions/Besoeksadresse",
									"@xsdUnhandledAttribute1" : "seres:elementtype=Dataegenskap",
									"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Dataegenskap/postadresseForetak/492453"
								}
						},
					"@xsdUnhandledAttribute1" : "seres:elementtype=Dataobjekttype",
					"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Dataobjekttype/Foretak/492157"
				},
			"Besoeksadresse" : {
					"properties" : {
							"gateadresse" : {
									"$ref" : "#/definitions/Tekst200",
									"@xsdUnhandledAttribute1" : "seres:elementtype=DataTypeegenskap",
									"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/DataTypeegenskap/gateadresse/486193"
								},
							"postnummer" : {
									"$ref" : "#/definitions/Postnummer",
									"@xsdUnhandledAttribute1" : "seres:elementtype=DataTypeegenskap",
									"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/DataTypeegenskap/postnummer/486192"
								},
							"poststed" : {
									"$ref" : "#/definitions/Tekst100",
									"@xsdUnhandledAttribute1" : "seres:elementtype=DataTypeegenskap",
									"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/DataTypeegenskap/poststed/486191"
								}
						},
					"@xsdUnhandledAttribute1" : "seres:elementtype=Datakomplekstype",
					"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Datakomplekstype/Besøksadresse/486194"
				},
			"Virksomhet" : {
					"properties" : {
							"organisasjonsnummerVirksomhet" : {
									"$ref" : "#/definitions/Organisasjonsnummer",
									"@xsdUnhandledAttribute1" : "seres:elementtype=Dataegenskap",
									"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Dataegenskap/organisasjonsnummerVirksomhet/492152"
								},
							"navnVirksomhet" : {
									"$ref" : "#/definitions/NavnString",
									"@xsdUnhandledAttribute1" : "seres:elementtype=Dataegenskap",
									"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Dataegenskap/navnVirksomhet/492151"
								},
							"adresseVirksomhet" : {
									"$ref" : "#/definitions/Besoeksadresse",
									"@xsdUnhandledAttribute1" : "seres:elementtype=Dataegenskap",
									"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Dataegenskap/forretningsadresseVirksomhet/492452"
								},
							"avdeling" : {
									"$ref" : "#/definitions/NavnString",
									"@xsdUnhandledAttribute1" : "seres:elementtype=Dataegenskap",
									"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Dataegenskap/avdeling/492150"
								}
						},
					"@xsdUnhandledAttribute1" : "seres:elementtype=Dataobjekttype",
					"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Dataobjekttype/Virksomhet/492153"
				},
			"StatusVirksomhetMedDriftsperiode" : {
					"properties" : {
							"driftsstatusPeriode" : {
									"$ref" : "#/definitions/DriftsstatusPeriode",
									"@xsdUnhandledAttribute1" : "seres:elementtype=Dataegenskap",
									"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Dataegenskap/driftsstatusPeriode/526333"
								}
						},
					"@xsdUnhandledAttribute1" : "seres:elementtype=Meldingsdel",
					"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Meldingsdel/StatusVirksomhetMedDriftsperiode/526334"
				},
			"Naeringskontrollspoersmaal" : {
					"properties" : {
							"visNaeringskontrollJaNeiPrefill" : {
									"$ref" : "#/definitions/SvaralternativJaNei",
									"@xsdUnhandledAttribute1" : "seres:elementtype=Dataegenskap",
									"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Dataegenskap/visNæringskontrollJaNeiPrefill/526330"
								},
							"Naeringskontroll" : {
									"$ref" : "#/definitions/Naeringskontroll",
									"@xsdUnhandledAttribute1" : "seres:elementtype=Relasjonsegenskap",
									"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Relasjonsegenskap/næringskontroll/526329"
								}
						},
					"@xsdUnhandledAttribute1" : "seres:elementtype=Meldingsdel",
					"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Meldingsdel/Næringskontroll/526331"
				},
			"Naeringskontroll" : {
					"properties" : {
							"naeringOk" : {
									"$ref" : "#/definitions/SvaralternativJaNei",
									"@xsdUnhandledAttribute1" : "seres:elementtype=Dataegenskap",
									"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Dataegenskap/næringOk/488726"
								},
							"naeringskode" : {
									"$ref" : "#/definitions/Naeringskode",
									"@xsdUnhandledAttribute1" : "seres:elementtype=Dataegenskap",
									"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Dataegenskap/næringskode/487207"
								},
							"naeringstekst" : {
									"$ref" : "#/definitions/Tekst4000",
									"@xsdUnhandledAttribute1" : "seres:elementtype=Dataegenskap",
									"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Dataegenskap/næringstekst/487206"
								},
							"naeringsbeskrivelse" : {
									"$ref" : "#/definitions/Tekst4000",
									"@xsdUnhandledAttribute1" : "seres:elementtype=Dataegenskap",
									"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Dataegenskap/næringsbeskrivelse/592349"
								},
							"nyNaeringsbeskrivelse" : {
									"$ref" : "#/definitions/NyNaeringsbeskrivelse",
									"@xsdUnhandledAttribute1" : "seres:elementtype=Relasjonsegenskap",
									"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Relasjonsegenskap/nyNæringsbeskrivelse/488725"
								}
						},
					"@xsdUnhandledAttribute1" : "seres:elementtype=Dataobjekttype",
					"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Dataobjekttype/Næringskontroll/488727"
				},
			"NyNaeringsbeskrivelse" : {
					"properties" : {
							"nyNaeringTekst" : {
									"$ref" : "#/definitions/Kommentar",
									"@xsdUnhandledAttribute1" : "seres:elementtype=Dataegenskap",
									"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Dataegenskap/nyNæringTekst/488723"
								},
							"alltidViktigsteAktivitet" : {
									"$ref" : "#/definitions/Checkboks01",
									"@xsdUnhandledAttribute1" : "seres:elementtype=Dataegenskap",
									"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Dataegenskap/AlltidViktigsteAktivitet/525326"
								},
							"datoNaeringsendring" : {
									"$ref" : "#/definitions/Dato",
									"@xsdUnhandledAttribute1" : "seres:elementtype=Dataegenskap",
									"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Dataegenskap/datoNæringsendring/594362"
								}
						},
					"@xsdUnhandledAttribute1" : "seres:elementtype=Dataobjekttype",
					"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Dataobjekttype/NyNæringsbeskrivelse/488724"
				},
			"Oppgavebyrde" : {
					"properties" : {
							"visOppgavebyrdeJaNeiPrefill" : {
									"$ref" : "#/definitions/SvaralternativJaNei",
									"@xsdUnhandledAttribute1" : "seres:elementtype=Dataegenskap",
									"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Dataegenskap/visOppgavebyrdeJaNeiPrefill/492910"
								},
							"antallPersonerHjelp" : {
									"$ref" : "#/definitions/AntallMedNull",
									"@xsdUnhandledAttribute1" : "seres:elementtype=Dataegenskap",
									"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Dataegenskap/antallPersonerHjelp/492704"
								},
							"fikkHjelpAvAndre" : {
									"$ref" : "#/definitions/SvaralternativJaNei",
									"@xsdUnhandledAttribute1" : "seres:elementtype=Dataegenskap",
									"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Dataegenskap/fikkHjelpAvAndre/492703"
								},
							"harSamletInformasjon" : {
									"$ref" : "#/definitions/SvaralternativJaNei",
									"@xsdUnhandledAttribute1" : "seres:elementtype=Dataegenskap",
									"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Dataegenskap/harSamletInformasjon/492702"
								},
							"tidsbrukSamleInformasjon" : {
									"$ref" : "#/definitions/Tidsbruk",
									"@xsdUnhandledAttribute1" : "seres:elementtype=Dataegenskap",
									"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Dataegenskap/tidsbrukSamleInformasjon/492701"
								},
							"tidsbrukSelveSkjemautfyllingen" : {
									"$ref" : "#/definitions/Tidsbruk",
									"@xsdUnhandledAttribute1" : "seres:elementtype=Dataegenskap",
									"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Dataegenskap/tidsbrukSelveSkjemautfyllingen/492700"
								},
							"tidsbrukTotalHjelpAvAndre" : {
									"$ref" : "#/definitions/Tidsbruk",
									"@xsdUnhandledAttribute1" : "seres:elementtype=Dataegenskap",
									"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Dataegenskap/tidsbrukTotalHjelpAvAndre/492699"
								}
						},
					"@xsdUnhandledAttribute1" : "seres:elementtype=Meldingsdel",
					"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Meldingsdel/Oppgavebyrde/492705"
				},
			"Tidsbruk" : {
					"properties" : {
							"AntallTimer" : {
									"$ref" : "#/definitions/AntallMedNull",
									"@xsdUnhandledAttribute1" : "seres:elementtype=DataTypeegenskap",
									"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/DataTypeegenskap/AntallTimer/487646"
								},
							"AntallMinutter" : {
									"$ref" : "#/definitions/AntallMinutter",
									"@xsdUnhandledAttribute1" : "seres:elementtype=DataTypeegenskap",
									"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/DataTypeegenskap/AntallMinutter/487645"
								}
						},
					"@xsdUnhandledAttribute1" : "seres:elementtype=Datakomplekstype",
					"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Datakomplekstype/Tidsbruk/487647"
				},
			"Skjemadata" : {
					"properties" : {
							"Data" : {
									"$ref" : "#/definitions/Data",
									"@xsdUnhandledAttribute1" : "seres:elementtype=Relasjonsegenskap",
									"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Relasjonsegenskap/Data/600883"
								},
							"Prefilldata" : {
									"$ref" : "#/definitions/Prefilldata",
									"@xsdUnhandledAttribute1" : "seres:elementtype=Relasjonsegenskap",
									"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Relasjonsegenskap/Prefilldata/600882"
								}
						},
					"@xsdUnhandledAttribute1" : "seres:elementtype=Meldingsdel",
					"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Meldingsdel/Skjemadata/600884"
				},
			"Data" : {
					"properties" : {
							"LedigeStillinger" : {
									"$ref" : "#/definitions/HeltallAlleMaks6siffer",
									"@xsdUnhandledAttribute1" : "seres:elementtype=Dataegenskap",
									"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Dataegenskap/SPML16/600880"
								}
						},
					"@xsdUnhandledAttribute1" : "seres:elementtype=Dataobjekttype",
					"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Dataobjekttype/Data/600881"
				},
			"Prefilldata" : {
					"properties" : {
							"AntallAnsatte" : {
									"$ref" : "#/definitions/TokenTekst",
									"@xsdUnhandledAttribute1" : "seres:elementtype=Dataegenskap",
									"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Dataegenskap/AntallAnsatte/600878"
								},
							"Dato" : {
									"$ref" : "#/definitions/TokenTekst",
									"@xsdUnhandledAttribute1" : "seres:elementtype=Dataegenskap",
									"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Dataegenskap/Dato/600877"
								}
						},
					"@xsdUnhandledAttribute1" : "seres:elementtype=Dataobjekttype",
					"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Dataobjekttype/Prefilldata/600879"
				},
			"Tekst_50" : {
					"$ref" : "#/definitions/Tekst_50Restriksjon",
					"@xsdUnhandledAttribute1" : "seres:elementtype=Dataenkeltype",
					"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Dataenkeltype/Tekst50/479312"
				},
			"Tekst_50Restriksjon" : {
					"maxLength" : 50,
					"type" : "string",
					"@xsdUnhandledAttribute1" : "seres:elementtype=Tegnrestriksjon",
					"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Tegnrestriksjon/Tekst_50Restriksjon/502232"
				},
			"allOfTest": {
					"allOf": [
						{
							"$ref": "#/definitions/Tekst_50"
						}
					]
				},
      "oneOfTestNullable": {
          "oneOf": [
            {
              "$ref": "#/definitions/Tekst_50"
            },
            {
              "type": "NULL"
            }
          ]
      },
			"Dato" : {
					"type" : "string",
					"format" : "date",
					"@xsdUnhandledAttribute1" : "seres:elementtype=Dataenkeltype",
					"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Dataenkeltype/Dato/479008"
				},
			"Tekst" : {
					"type" : "string",
					"@xsdUnhandledAttribute1" : "seres:elementtype=Dataenkeltype",
					"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Dataenkeltype/Tekst/476104"
				},
			"Tekst_30" : {
					"$ref" : "#/definitions/Tekst_30Restriksjon",
					"@xsdUnhandledAttribute1" : "seres:elementtype=Dataenkeltype",
					"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Dataenkeltype/Tekst_30/492116"
				},
			"Tekst_30Restriksjon" : {
					"maxLength" : 30,
					"type" : "string",
					"@xsdUnhandledAttribute1" : "seres:elementtype=Tegnrestriksjon",
					"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Tegnrestriksjon/Tekst_30Restriksjon/502224"
				},
			"Tekst_09" : {
					"$ref" : "#/definitions/Tekst_09Restriksjon",
					"@xsdUnhandledAttribute1" : "seres:elementtype=Dataenkeltype",
					"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Dataenkeltype/Tekst_09/566760"
				},
			"Tekst_09Restriksjon" : {
					"maxLength" : 9,
					"type" : "string",
					"@xsdUnhandledAttribute1" : "seres:elementtype=Tegnrestriksjon",
					"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Tegnrestriksjon/Tekst_09Restriksjon/566758"
				},
			"StatistiskeEnhetstyper" : {
					"enum" : [
							"ADRE",
							"BEDR",
							"BOLI",
							"BYGG",
							"FRTK",
							"HUSH",
							"PERS"
						],
					"type" : "string",
					"@xsdUnhandledAttribute1" : "seres:elementtype=Datakodeliste",
					"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Datakodeutvalg/StatistiskeEnhetstyper/492035"
				},
			"Kommentar" : {
					"$ref" : "#/definitions/Kommentar2000Restriksjon",
					"@xsdUnhandledAttribute1" : "seres:elementtype=Dataenkeltype",
					"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Dataenkeltype/Kommentar/4721"
				},
			"Kommentar2000Restriksjon" : {
					"minLength" : 1,
					"maxLength" : 2000,
					"type" : "string",
					"@xsdUnhandledAttribute1" : "seres:elementtype=Tegnrestriksjon",
					"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Tegnrestriksjon/Kommentar2000Restriksjon/502246"
				},
			"Epost" : {
					"$ref" : "#/definitions/EPostRestriksjon",
					"@xsdUnhandledAttribute1" : "seres:elementtype=Dataenkeltype",
					"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Dataenkeltype/Epost/476105"
				},
			"EPostRestriksjon" : {
					"minLength" : 1,
					"maxLength" : 100,
					"type" : "string",
					"@xsdUnhandledAttribute1" : "seres:elementtype=Tegnrestriksjon",
					"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Tegnrestriksjon/EPostRestriksjon/502244"
				},
			"NavnSomToken" : {
					"type" : "string",
					"@xsdUnhandledAttribute1" : "seres:elementtype=Dataenkeltype",
					"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Dataenkeltype/NavnSomToken/488179"
				},
			"Tekst_25" : {
					"$ref" : "#/definitions/Tekst_25Restriksjon",
					"@xsdUnhandledAttribute1" : "seres:elementtype=Dataenkeltype",
					"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Dataenkeltype/Tekst_25/566761"
				},
			"Tekst_25Restriksjon" : {
					"maxLength" : 25,
					"type" : "string",
					"@xsdUnhandledAttribute1" : "seres:elementtype=Tegnrestriksjon",
					"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Tegnrestriksjon/Tekst_25Restriksjon/566759"
				},
			"Organisasjonsnummer" : {
					"$ref" : "#/definitions/OrganisasjonsnummerRestriksjon",
					"@xsdUnhandledAttribute1" : "seres:elementtype=Dataenkeltype",
					"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Dataenkeltype/Organisasjonsnummer/476107"
				},
			"OrganisasjonsnummerRestriksjon" : {
					"minLength" : 9,
					"maxLength" : 9,
					"type" : "string",
					"@xsdUnhandledAttribute1" : "seres:elementtype=Tegnrestriksjon",
					"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Tegnrestriksjon/OrganisasjonsnummerRestriksjon/502234"
				},
			"Tekst200" : {
					"$ref" : "#/definitions/Tekst200Restriksjon",
					"@xsdUnhandledAttribute1" : "seres:elementtype=Dataenkeltype",
					"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Dataenkeltype/Tekst200/491779"
				},
			"Tekst200Restriksjon" : {
					"maxLength" : 200,
					"type" : "string",
					"@xsdUnhandledAttribute1" : "seres:elementtype=Tegnrestriksjon",
					"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Tegnrestriksjon/Tekst200Restriksjon/502227"
				},
			"Postnummer" : {
					"$ref" : "#/definitions/Tallkode_4SiffRestriksjon",
					"@xsdUnhandledAttribute1" : "seres:elementtype=Dataenkeltype",
					"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Dataenkeltype/Postnummer/4733"
				},
			"Tallkode_4SiffRestriksjon" : {
					"minLength" : 4,
					"maxLength" : 4,
					"pattern" : "\d\d\d\d",
					"type" : "string",
					"@xsdUnhandledAttribute1" : "seres:elementtype=Tegnrestriksjon",
					"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Tegnrestriksjon/Tallkode_4SiffRestriksjon/502226"
				},
			"Tekst100" : {
					"$ref" : "#/definitions/Tekst100Restriksjon",
					"@xsdUnhandledAttribute1" : "seres:elementtype=Dataenkeltype",
					"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Dataenkeltype/Tekst100/479311"
				},
			"Tekst100Restriksjon" : {
					"maxLength" : 100,
					"type" : "string",
					"@xsdUnhandledAttribute1" : "seres:elementtype=Tegnrestriksjon",
					"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Tegnrestriksjon/Tekst100Restriksjon/502231"
				},
			"NavnString" : {
					"$ref" : "#/definitions/NavnRestriksjon",
					"@xsdUnhandledAttribute1" : "seres:elementtype=Dataenkeltype",
					"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Dataenkeltype/Navn/4722"
				},
			"NavnRestriksjon" : {
					"minLength" : 1,
					"maxLength" : 200,
					"type" : "string",
					"@xsdUnhandledAttribute1" : "seres:elementtype=Tegnrestriksjon",
					"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Tegnrestriksjon/NavnRestriksjon/502238"
				},
			"DriftsstatusPeriode" : {
					"enum" : [
							"jaDrift",
							"jaDriftPeriode",
							"neiDriftPeriode"
						],
					"type" : "string",
					"@xsdUnhandledAttribute1" : "seres:elementtype=Datakodeliste",
					"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Datakodeliste/DriftsstatusPeriode/524891"
				},
			"SvaralternativJaNei" : {
					"enum" : [
							"1",
							"2",
							""
						],
					"type" : "string",
					"@xsdUnhandledAttribute1" : "seres:elementtype=Datakodeliste",
					"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Datakodeutvalg/Svaralternativ/13653"
				},
			"Naeringskode" : {
					"$ref" : "#/definitions/Tekst_06Restriksjon",
					"@xsdUnhandledAttribute1" : "seres:elementtype=Dataenkeltype",
					"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Dataenkeltype/Næringskode/13640"
				},
			"Tekst_06Restriksjon" : {
					"maxLength" : 6,
					"type" : "string",
					"@xsdUnhandledAttribute1" : "seres:elementtype=Tegnrestriksjon",
					"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Tegnrestriksjon/Tekst_06Restriksjon/571136"
				},
			"Tekst4000" : {
					"$ref" : "#/definitions/Tekst4000Restriksjon",
					"@xsdUnhandledAttribute1" : "seres:elementtype=Dataenkeltype",
					"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Dataenkeltype/Tekst4000/571139"
				},
			"Tekst4000Restriksjon" : {
					"maxLength" : 4000,
					"type" : "string",
					"@xsdUnhandledAttribute1" : "seres:elementtype=Tegnrestriksjon",
					"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Tegnrestriksjon/Tekst4000Restriksjon/571137"
				},
			"Checkboks01" : {
					"enum" : [
							"1",
							"0",
							""
						],
					"type" : "string",
					"@xsdUnhandledAttribute1" : "seres:elementtype=Datakodeliste",
					"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Datakodeliste/Checkboks01/593709"
				},
			"AntallMedNull" : {
					"$ref" : "#/definitions/AntallRestriksjon",
					"@xsdUnhandledAttribute1" : "seres:elementtype=Dataenkeltype",
					"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Dataenkeltype/AntallMedNull/477092"
				},
			"AntallRestriksjon" : {
					"type" : "integer",
					"minimum" : 0,
					"@xsdUnhandledAttribute1" : "seres:elementtype=Tallrestriksjon",
					"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Tallrestriksjon/AntallRestriksjon/502249"
				},
			"AntallMinutter" : {
					"$ref" : "#/definitions/AntallMinutterRestriksjon",
					"@xsdUnhandledAttribute1" : "seres:elementtype=Dataenkeltype",
					"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Dataenkeltype/AntallMinutter/592850"
				},
			"AntallMinutterRestriksjon" : {
					"minimum" : 0,
					"maximum" : 59,
					"type" : "integer",
					"@xsdUnhandledAttribute1" : "seres:elementtype=Tallrestriksjon",
					"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Tallrestriksjon/AntallMinutterRestriksjon/592849"
				},
			"HeltallAlleMaks6siffer" : {
					"$ref" : "#/definitions/HeltallMaks6sifferRestriksjon",
					"@xsdUnhandledAttribute1" : "seres:elementtype=Dataenkeltype",
					"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Dataenkeltype/AlleHeltallMaks6siffer/479391"
				},
			"HeltallMaks6sifferRestriksjon" : {
					"minimum" : -999999,
					"maximum" : 999999,
					"type" : "integer",
					"@xsdUnhandledAttribute1" : "seres:elementtype=Tallrestriksjon",
					"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Tallrestriksjon/HeltallMaks6sifferRestriksjon/502001"
				},
			"TokenTekst" : {
					"type" : "string",
					"@xsdUnhandledAttribute1" : "seres:elementtype=Dataenkeltype",
					"@xsdUnhandledAttribute2" : "seres:guid=http://seres.no/guid/StatistiskSentralbyrå/Dataenkeltype/TokenTekst/486190"
				}
		}
}`;

export const dataMock = JSON.parse(mockString);

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
									"$ref" : "#/definitions/InternInformasjon"
								},
							"KontaktpersonOgKommentarfelt" : {
									"$ref" : "#/definitions/KontaktpersonOgKommentarfelt"
								},
							"ForetakOgVirksomhetsopplysninger" : {
									"$ref" : "#/definitions/ForetakOgVirksomhetsopplysninger"
								},
							"StatusVirksomhetMedDriftsperiode" : {
									"$ref" : "#/definitions/StatusVirksomhetMedDriftsperiode"
								},
							"Naeringskontrollspoersmaal" : {
									"$ref" : "#/definitions/Naeringskontrollspoersmaal"
								},
							"Oppgavebyrde" : {
									"$ref" : "#/definitions/Oppgavebyrde"
								},
							"Skjemadata" : {
									"$ref" : "#/definitions/Skjemadata"
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
					"@xsdAnyAttribute" : true
				},
			"InternInformasjon" : {
					"properties" : {
							"periodeFritekst" : {
									"$ref" : "#/definitions/Tekst_50"
								},
							"rapportPeriode" : {
									"$ref" : "#/definitions/Tidsrom"
								},
							"raNummer" : {
									"$ref" : "#/definitions/Tekst"
								},
							"delRegNummer" : {
									"$ref" : "#/definitions/Tekst"
								},
							"identnummerEnhet" : {
									"$ref" : "#/definitions/Tekst_30"
								},
							"sendtFraSluttbrukersystem" : {
									"$ref" : "#/definitions/Tekst_09"
								},
							"statistiskEnhet" : {
									"$ref" : "#/definitions/StatistiskEnhet"
								}
						},
					"required" : [
							"raNummer"
						]
				},
			"Tidsrom" : {
					"properties" : {
							"fomDato" : {
									"$ref" : "#/definitions/Dato"
								},
							"tomDato" : {
									"$ref" : "#/definitions/Dato"
								}
						}
				},
			"StatistiskEnhet" : {
					"properties" : {
							"enhetsident" : {
									"$ref" : "#/definitions/Tekst_50"
								},
							"enhetstype" : {
									"$ref" : "#/definitions/StatistiskeEnhetstyper"
								}
						}
				},
			"KontaktpersonOgKommentarfelt" : {
					"properties" : {
							"kommentar" : {
									"$ref" : "#/definitions/Kommentar"
								},
							"kontaktperson" : {
									"$ref" : "#/definitions/Kontaktperson"
								}
						}
				},
			"Kontaktperson" : {
					"properties" : {
							"epostadresse" : {
									"$ref" : "#/definitions/Epost"
								},
							"navn" : {
									"$ref" : "#/definitions/NavnSomToken"
								},
							"telefonSFU" : {
									"$ref" : "#/definitions/Tekst_25"
								}
						}
				},
			"ForetakOgVirksomhetsopplysninger" : {
					"properties" : {
							"organisasjonsnummerKontekst" : {
									"$ref" : "#/definitions/Organisasjonsnummer"
								},
							"foretak" : {
									"$ref" : "#/definitions/Foretak"
								},
							"virksomhet" : {
									"$ref" : "#/definitions/Virksomhet"
								}
						}
				},
			"Foretak" : {
					"properties" : {
							"organisasjonsnummerForetak" : {
									"$ref" : "#/definitions/Organisasjonsnummer"
								},
							"navnForetak" : {
									"$ref" : "#/definitions/Tekst"
								},
							"adresseForetak" : {
									"$ref" : "#/definitions/Besoeksadresse"
								}
						}
				},
			"Besoeksadresse" : {
					"properties" : {
							"gateadresse" : {
									"$ref" : "#/definitions/Tekst200"
								},
							"postnummer" : {
									"$ref" : "#/definitions/Postnummer"
								},
							"poststed" : {
									"$ref" : "#/definitions/Tekst100"
								}
						}
				},
			"Virksomhet" : {
					"properties" : {
							"organisasjonsnummerVirksomhet" : {
									"$ref" : "#/definitions/Organisasjonsnummer"
								},
							"navnVirksomhet" : {
									"$ref" : "#/definitions/NavnString"
								},
							"adresseVirksomhet" : {
									"$ref" : "#/definitions/Besoeksadresse"
								},
							"avdeling" : {
									"$ref" : "#/definitions/NavnString"
								}
						}
				},
			"StatusVirksomhetMedDriftsperiode" : {
					"properties" : {
							"driftsstatusPeriode" : {
									"$ref" : "#/definitions/DriftsstatusPeriode"
								}
						}
				},
			"Naeringskontrollspoersmaal" : {
					"properties" : {
							"visNaeringskontrollJaNeiPrefill" : {
									"$ref" : "#/definitions/SvaralternativJaNei"
								},
							"Naeringskontroll" : {
									"$ref" : "#/definitions/Naeringskontroll"
								}
						}
				},
			"Naeringskontroll" : {
					"properties" : {
							"naeringOk" : {
									"$ref" : "#/definitions/SvaralternativJaNei"
								},
							"naeringskode" : {
									"$ref" : "#/definitions/Naeringskode"
								},
							"naeringstekst" : {
									"$ref" : "#/definitions/Tekst4000"
								},
							"naeringsbeskrivelse" : {
									"$ref" : "#/definitions/Tekst4000"
								},
							"nyNaeringsbeskrivelse" : {
									"$ref" : "#/definitions/NyNaeringsbeskrivelse"
								}
						}
				},
			"NyNaeringsbeskrivelse" : {
					"properties" : {
							"nyNaeringTekst" : {
									"$ref" : "#/definitions/Kommentar"
								},
							"alltidViktigsteAktivitet" : {
									"$ref" : "#/definitions/Checkboks01"
								},
							"datoNaeringsendring" : {
									"$ref" : "#/definitions/Dato"
								}
						}
				},
			"Oppgavebyrde" : {
					"properties" : {
							"visOppgavebyrdeJaNeiPrefill" : {
									"$ref" : "#/definitions/SvaralternativJaNei"
								},
							"antallPersonerHjelp" : {
									"$ref" : "#/definitions/AntallMedNull"
								},
							"fikkHjelpAvAndre" : {
									"$ref" : "#/definitions/SvaralternativJaNei"
								},
							"harSamletInformasjon" : {
									"$ref" : "#/definitions/SvaralternativJaNei"
								},
							"tidsbrukSamleInformasjon" : {
									"$ref" : "#/definitions/Tidsbruk"
								},
							"tidsbrukSelveSkjemautfyllingen" : {
									"$ref" : "#/definitions/Tidsbruk"
								},
							"tidsbrukTotalHjelpAvAndre" : {
									"$ref" : "#/definitions/Tidsbruk"
								}
						}
				},
			"Tidsbruk" : {
					"properties" : {
							"AntallTimer" : {
									"$ref" : "#/definitions/AntallMedNull"
								},
							"AntallMinutter" : {
									"$ref" : "#/definitions/AntallMinutter"
								}
						}
				},
			"Skjemadata" : {
					"properties" : {
							"Data" : {
									"$ref" : "#/definitions/Data"
								},
							"Prefilldata" : {
									"$ref" : "#/definitions/Prefilldata"
								}
						}
				},
			"Data" : {
					"properties" : {
							"LedigeStillinger" : {
									"$ref" : "#/definitions/HeltallAlleMaks6siffer"
								}
						}
				},
			"Prefilldata" : {
					"properties" : {
							"AntallAnsatte" : {
									"$ref" : "#/definitions/TokenTekst"
								},
							"Dato" : {
									"$ref" : "#/definitions/TokenTekst"
								}
						}
				},
			"Tekst_50" : {
					"$ref" : "#/definitions/Tekst_50Restriksjon"
				},
			"Tekst_50Restriksjon" : {
					"maxLength" : 50,
					"type" : "string"
				},
			"Dato" : {
					"type" : "string",
					"format" : "date"
				},
			"Tekst" : {
					"type" : "string"
				},
			"Tekst_30" : {
					"$ref" : "#/definitions/Tekst_30Restriksjon"
				},
			"Tekst_30Restriksjon" : {
					"maxLength" : 30,
					"type" : "string"
				},
			"Tekst_09" : {
					"$ref" : "#/definitions/Tekst_09Restriksjon"
				},
			"Tekst_09Restriksjon" : {
					"maxLength" : 9,
					"type" : "string"
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
					"type" : "string"
				},
			"Kommentar" : {
					"$ref" : "#/definitions/Kommentar2000Restriksjon"
				},
			"Kommentar2000Restriksjon" : {
					"minLength" : 1,
					"maxLength" : 2000,
					"type" : "string"
				},
			"Epost" : {
					"$ref" : "#/definitions/EPostRestriksjon"
				},
			"EPostRestriksjon" : {
					"minLength" : 1,
					"maxLength" : 100,
					"type" : "string"
				},
			"NavnSomToken" : {
					"type" : "string"
				},
			"Tekst_25" : {
					"$ref" : "#/definitions/Tekst_25Restriksjon"
				},
			"Tekst_25Restriksjon" : {
					"maxLength" : 25,
					"type" : "string"
				},
			"Organisasjonsnummer" : {
					"$ref" : "#/definitions/OrganisasjonsnummerRestriksjon"
				},
			"OrganisasjonsnummerRestriksjon" : {
					"minLength" : 9,
					"maxLength" : 9,
					"type" : "string"
				},
			"Tekst200" : {
					"$ref" : "#/definitions/Tekst200Restriksjon"
				},
			"Tekst200Restriksjon" : {
					"maxLength" : 200,
					"type" : "string"
				},
			"Postnummer" : {
					"$ref" : "#/definitions/Tallkode_4SiffRestriksjon"
				},
			"Tallkode_4SiffRestriksjon" : {
					"minLength" : 4,
					"maxLength" : 4,
					"pattern" : "\d\d\d\d",
					"type" : "string"
				},
			"Tekst100" : {
					"$ref" : "#/definitions/Tekst100Restriksjon"
				},
			"Tekst100Restriksjon" : {
					"maxLength" : 100,
					"type" : "string"
				},
			"NavnString" : {
					"$ref" : "#/definitions/NavnRestriksjon"
				},
			"NavnRestriksjon" : {
					"minLength" : 1,
					"maxLength" : 200,
					"type" : "string"
				},
			"DriftsstatusPeriode" : {
					"enum" : [
							"jaDrift",
							"jaDriftPeriode",
							"neiDriftPeriode"
						],
					"type" : "string"
				},
			"SvaralternativJaNei" : {
					"enum" : [
							"1",
							"2",
							""
						],
					"type" : "string"
				},
			"Naeringskode" : {
					"$ref" : "#/definitions/Tekst_06Restriksjon"
				},
			"Tekst_06Restriksjon" : {
					"maxLength" : 6,
					"type" : "string"
				},
			"Tekst4000" : {
					"$ref" : "#/definitions/Tekst4000Restriksjon"
				},
			"Tekst4000Restriksjon" : {
					"maxLength" : 4000,
					"type" : "string"
				},
			"Checkboks01" : {
					"enum" : [
							"1",
							"0",
							""
						],
					"type" : "string"
				},
			"AntallMedNull" : {
					"$ref" : "#/definitions/AntallRestriksjon"
				},
			"AntallRestriksjon" : {
					"type" : "integer",
					"minimum" : 0
				},
			"AntallMinutter" : {
					"$ref" : "#/definitions/AntallMinutterRestriksjon"
				},
			"AntallMinutterRestriksjon" : {
					"minimum" : 0,
					"maximum" : 59,
					"type" : "integer"
				},
			"HeltallAlleMaks6siffer" : {
					"$ref" : "#/definitions/HeltallMaks6sifferRestriksjon"
				},
			"HeltallMaks6sifferRestriksjon" : {
					"minimum" : -999999,
					"maximum" : 999999,
					"type" : "integer"
				},
			"TokenTekst" : {
					"type" : "string"
				}
		}
}`

export const dataMock = JSON.parse(mockString);
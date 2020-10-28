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
			"XSLT-skriptnavn" : "SERES_XSD_GEN"
		},
	"definitions" : {
			"RA-0678_M" : {
					"properties" : {
							"KontaktpersonOgKommentarfelt" : {
									"$ref" : "#/definitions/KontaktpersonOgKommentarfelt"
								}
						},
					"required" : [
							"KontaktpersonOgKommentarfelt"
						],
					"@xsdAnyAttribute" : true
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
				}
		}
}`

export const dataMock = JSON.parse(mockString);
# ALTINN RESOURCES STRUCTURE AND RULES
## CRITICAL REQUIREMENT
When working with resources, all resource files must be updated. The resources exist in the directory App/config/texts/ within the Altinn Studio application. This is the standard location where all text resources for the application are stored and managed.

## FILE STRUCTURE

### 1. RESOURCE FILE (resource.[language].json)

**Structure:**
- language: two letter string, represents language on the values
- resources: array of objects with id and value
    - id: string, represents the id for the resource, must match 
    - value: string, represents the value for the resource

**Example:**
```json
{
    "language": "nb",
    "resources": [
        {
            "id": "id",
            "value": "value"
        }
    ]
}
```
### 2. RESOURCES FROM DATA MODEL
Inputs relevant text from the datamodel

**Structure:**
- id: string, represents the id for the resource
- value: string, represents the value for the resource, with inputs {i} that should be replaced with the value from the datamodel
- variables: array of objects with key, dataSource and defaultValue
    - key: string, represents the key for the variable as the property name in the model
    - dataSource: string, represents the model where the variable is found
    - defaultValue: string, represents the defaultValue for the variable

**Example:**
```json
{
    "id": "Sporsmaal.Paragraph-XgJ0hY.title",
    "value": "Dette er oppdateringene vi har så langt.\n\n Ditt telefonnummer er: {0} \n\n Din epostadresse er: {1}",
    "variables": [
    {
        "key": "kontaktinformasjon.Telefonnummer",
        "dataSource": "dataModel.model",
        "defaultValue": " "
    },
    {
        "key": "kontaktinformasjon.Epost",
        "dataSource": "dataModel.model",
        "defaultValue": " "
    }
    ]
}
```

## EDITING GUIDELINES

### 1. Adding a Resource:
- Add to all resource files with consistent naming and types
- Id must match id for the component in the layouts

### 2. Removing a Resource:
- Find relevant id from the layouts
- Remove from all resource files

### 3. Modifying a Resource:
- Find relevant id from the layouts
- Update in all resource files

### 4. Adding a language
- Add new resource file with filename resource.[language].json
    - Generate all resources from the previous resource files into the new one
- Important: When using multiple languages, add the field "showLanguageSelector" : true to ui/form/Settings.json, inside the pages property
- in App/config/applicationmetadata.json, add the title in the new language

### 5. Displaying resource as text from datamodel
- Find relevant id from the layouts
- Find resource in resource.[language].json
- Map variables to the relevant properties in the datamodel
- Use the variables in the value field of the resource


## MANDATORY VALIDATION CHECKLIST

### Cross-File Consistency
- [ ] Id identical across all resourcefiles
- [ ] Id matches component in the layout files
- [ ] All resources exists in all resource files
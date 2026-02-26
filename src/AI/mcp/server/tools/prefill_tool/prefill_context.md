# PREFILL CONFIGURATION FOR ALTINN APPS

## OVERVIEW

This document explains how to implement automatic data prefilling in Altinn apps. When implementing prefill functionality, you'll create a configuration file that maps data from external sources to fields in the app's data model.

## IMPLEMENTATION DETAILS

### File Location and Naming Convention

The prefill configuration file must be placed in the `App/models` directory and follow this naming pattern:

```
[dataModelName].prefill.json
```

For example, if your data model is named `appModel`, you should have:
- `appModel.cs` - The C# data model
- `appModel.schema.json` - The JSON schema
- `appModel.prefill.json` - The prefill configuration file

Remember, dont create any new datamodels unless specifically requested by the user. 

### Configuration Structure

The prefill configuration uses this JSON structure:

```json
{
    "$schema": "https://altinncdn.no/schemas/json/prefill/prefill.schema.v1.json",
    "allowOverwrite": true,
    "ER": {
        // Business Register mappings
    },
    "DSF": {
        // Population Register mappings
    },
    "UserProfile": {
        // User Profile mappings
    },
    "QueryParameters": {
        // Query parameter mappings
    }
}
```
### Configuration Properties

- **`$schema`**: Points to the JSON schema definition of the file. The current version is v1. Because of this file, Visual Studio Code will validate and offer intellisense/autocomplete when you edit the file locally.
- **`allowOverwrite`**: Determines whether prefill defined in this file can overwrite a field in the data model if it already has a value. When `true`, prefilled data can overwrite existing values.
- **`ER`**: Maps data from the Central Coordinating Register for the ORGANIZATION on whose behalf the form is being submitted. ONLY available when instantiating on behalf of an organization. Instantiation will fail if you attempt to prefill ER-data but do not have an organization context.
- **`DSF`**: Maps data from the National Population Register for the PERSON on whose behalf the form is being submitted. ONLY available when instantiating on behalf of a person. Instantiation will fail if you attempt to prefill DSF-data but do not have a person context (e.g., when submitting on behalf of an organization).
- **`UserProfile`**: Maps data from the profile of the SUBMITTER (the logged-in user who is filling out the form). This is always the person who is currently logged in and submitting the form, regardless of whether they're submitting on their own behalf or on behalf of someone else. This data is always available.
- **`QueryParameters`**: Maps data from URL query parameters to fields in your data model. Requires custom setup to work.

### Mapping Syntax

Within each source section, define mappings using this pattern:

```json
"SourceField": "TargetModelPath"
```

Where:
- `SourceField` is the field name from the external data source
- `TargetModelPath` is the path to the property in your data model (using dot notation for nested properties)

## QUICK REFERENCE: DATA SOURCES

- **UserProfile**: Contains information about the SUBMITTER (the person filling out the form), regardless of who they're representing. Always available. This is ALWAYS the logged-in user, even when representing another person or organization.
- **ER**: Contains information about the ORGANIZATION on whose behalf the form is being submitted. Only available when submitting on behalf of an organization. This is the REPRESENTED ORGANIZATION, not the submitter.
- **DSF**: Contains information about the PERSON on whose behalf the form is being submitted. Only available when submitting on behalf of a person (not an organization). This is the REPRESENTED PERSON, not the submitter.
- **QueryParameters**: Contains values passed in the URL query string. Requires custom setup.

> **IMPORTANT**: There is no "User" data source in Altinn prefill. All user information comes from UserProfile.

### User Profile (UserProfile)

The UserProfile data source contains information about the SUBMITTER - the person who is currently logged in and filling out the form. This is ALWAYS the data of the person submitting the form, regardless of who they're submitting on behalf of.

**Important distinction:**
- If Ola Nordmann submits a form on behalf of Kari Nordmann (a person), UserProfile contains Ola's information, while DSF contains Kari's information.
- If Ola Nordmann submits a form on behalf of Acme Inc. (an organization), UserProfile contains Ola's information, while ER contains Acme's information.

UserProfile is the appropriate source to use when you need information about the person who is actually filling out the form (the submitter).

**Important: Party Object as a Universal Access Point**
The UserProfile.Party object provides access to ALL relevant data, regardless of representation context:

- UserProfile.Party.Person contains the same fields as DSF-prefill
- UserProfile.Party.Organization contains the same fields as ER-prefill

This means you can access ALL relevant data through UserProfile, making it a universal access point:

1. For the logged-in user's information: Use direct UserProfile fields (Email, PhoneNumber, etc.)
2. For the represented person's information: Use UserProfile.Party.Person (same fields as DSF)
3. For the represented organization's information: Use UserProfile.Party.Organization (same fields as ER)

This approach eliminates the need to determine which data source to use in many cases.


- `UserId` - User ID
- `UserName` - Username of the user logged in.
- `PhoneNumber` - Phone number
- `Email` - Email address
- `PartyId` - Party ID
- `Party.PartyId` - Party ID
- `Party.PartyTypeName` - Party type name
- `Party.OrgNumber` - Organization number
- `Party.SSN` - Personal identification number
- `Party.UnitType` - Unit type
- `Party.Name` - The full name of the party
- `Party.isDeleted` - Deletion status
- `Party.OnlyHierarchyElementWithNoAccess` - Access status
- `Party.Person` - Person object - Same properties as in DSF-prefill
- `Party.Organization` - Organization object - Same properties as in ER-prefill
- `Party.ChildParties` - Child parties
- `UserType` - User type
- `ProfileSettingPreference.Language` - Language preference
- `ProfileSettingPreference.PreSelectedPartyId` - Pre-selected party ID
- `ProfileSettingsPreference.DoNotPromptForParty` - Party prompt preference


### The National Population Register (DSF)

The personal data that is exposed is attached to the person the form is instantiated on behalf of. If Ola Nordmann were to instantiate a form on behalf of Kari Nordmann, it would be Kari's data that would be exposed. In other words, if the form is instantiated on behalf of a person, the data exposed will be the data of the person the form is instantiated on behalf of. If a form is instantiated on behalf of an organization, the DSF data will not be available for person data. The person who instantiates the form will be available in the user profile. Available values for prefill includes:

- `SSN` - Personal identification number
- `Name` - Full name
- `FirstName` - First name
- `MiddleName` - Middle name
- `LastName` - Last name
- `TelephoneNumber` - Telephone number
- `MobileNumber` - Mobile phone number
- `MailingAddress` - Mailing address
- `MailingPostalCode` - Mailing postal code
- `MailingPostalCity` - Mailing city/town
- `AddressMunicipalNumber` - Municipal number for address
- `AddressMunicipalName` - Municipal name for address
- `AddressStreetName` - Street name
- `AddressHouseNumber` - House number
- `AddressHouseLetter` - House letter
- `AddressPostalCode` - Postal code
- `AddressCity` - City/town

### The Central Coordinating Register (ER)

The unit exposed is that which is attached to the organization a form is instantiated on behalf of. Available values for prefill includes:

- `OrgNumber` - Organization number
- `Name` - Organization name
- `UnitType` - Organization type
- `TelephoneNumber` - Telephone number
- `MobileNumber` - Mobile phone number
- `FaxNumber` - Fax number
- `EMailAddress` - Email address
- `InternetAddress` - Internet address
- `MailingAddress` - Mailing address
- `MailingPostalCode` - Mailing postal code
- `MailingPostalCity` - Mailing city/town
- `BusinessAddress` - Business address
- `BusinessPostalCode` - Business postal code
- `BusinessPostalCity` - Business city/town


### Best Practices For Register Use

#### Recommended Approach: Using UserProfile.Party

The simplest and most reliable approach is to use the UserProfile.Party object for all prefill needs:

```json
{
    "UserProfile": {
        "Party.Person.FirstName": "Person.FirstName",
        "Party.Organization.Name": "Organization.Name"
    }
}
```

This approach works regardless of whether the user is representing themselves, another person, or an organization.

#### Traditional Approach: Using Specific Data Sources

If you prefer to use the traditional approach with separate data sources:

- When referencing the person who is actively submitting the form, use the UserProfile data source.
- When referencing the organization that is actively submitting the form, use the UserProfile data source.
- When referencing the person that is being submitted on behalf of (if not an organization), use the DSF data source.
- When referencing the organization that is being submitted on behalf of, use the ER data source.

#### Common Pitfalls to Avoid

1. **DO NOT** create or use a "User" data source - it doesn't exist in Altinn prefill.
2. **DO NOT** use DSF to access the logged-in user's information - use UserProfile instead.
3. **DO NOT** confuse UserProfile (the logged-in user) with DSF (the represented person).

**Important:**
When interpreting prompts: 
- Note that the most common use case is that the form is submitted on behalf of an organization, and that a person (the submitter) is filling out the form as a representative for the organization. 
- When asked for person data fields such as name, phone number, emails etc. it usually refers to the person submitting the form (the submitter), unless clearly specified. 


## CODE EXAMPLES

### Basic Example

For a data model with the following structure:
```csharp
public class AppModel
{
    public Organization Organization { get; set; }
    public Person Person { get; set; }
    public Submitter Submitter { get; set; } // Note: Changed from 'User' to 'Submitter' for clarity
}

public class Organization
{
    public string OrgNo { get; set; }
    public string Name { get; set; }
}

public class Person
{
    public string PersonNr { get; set; }
    public string FirstName { get; set; }
    public string LastName { get; set; }
}

public class Submitter
{
    public string Email { get; set; }
    public string PhoneNumber { get; set; }
}
```

#### Recommended Approach (Using UserProfile.Party)

```json
{
    "$schema": "https://altinncdn.no/schemas/json/prefill/prefill.schema.v1.json",
    "allowOverwrite": true,
    "UserProfile": {
        "Email": "Submitter.Email",
        "PhoneNumber": "Submitter.PhoneNumber",
        "Party.Organization.OrgNumber": "Organization.OrgNo",
        "Party.Organization.Name": "Organization.Name",
        "Party.Person.SSN": "Person.PersonNr",
        "Party.Person.FirstName": "Person.FirstName",
        "Party.Person.LastName": "Person.LastName"
    }
}
```

#### Traditional Approach (Using Separate Data Sources)

```json
{
    "$schema": "https://altinncdn.no/schemas/json/prefill/prefill.schema.v1.json",
    "allowOverwrite": true,
    "ER": {
        "OrgNumber": "Organization.OrgNo",
        "Name": "Organization.Name"
    },
    "DSF": {
        "SSN": "Person.PersonNr",
        "FirstName": "Person.FirstName",
        "LastName": "Person.LastName"
    },
    "UserProfile": {
        "Email": "Submitter.Email",
        "PhoneNumber": "Submitter.PhoneNumber"
    }
}
```

> **IMPORTANT**: Notice that we map UserProfile fields to Submitter properties, NOT to a "User" object. There is no "User" data source in Altinn prefill.

### Complex Example with Nested Properties

For more complex data models with nested properties:

```json
{
    "$schema": "https://altinncdn.no/schemas/json/prefill/prefill.schema.v1.json",
    "allowOverwrite": true,
    "ER": {
        "OrgNumber": "Company.Details.OrganizationNumber",
        "Name": "Company.Details.OfficialName",
        "BusinessAddress": "Company.Address.Street",
        "BusinessPostalCode": "Company.Address.PostalCode",
        "BusinessPostalCity": "Company.Address.City"
    },
    "DSF": {
        "SSN": "Representative.PersonalInfo.SSN",
        "FirstName": "Representative.PersonalInfo.GivenName",
        "LastName": "Representative.PersonalInfo.FamilyName",
        "AddressStreetName": "Representative.ContactInfo.Address.Street",
        "AddressPostalCode": "Representative.ContactInfo.Address.PostalCode",
        "AddressCity": "Representative.ContactInfo.Address.City"
    },
    "UserProfile": {
        "Email": "Representative.ContactInfo.EmailAddress",
        "PhoneNumber": "Representative.ContactInfo.PhoneNumber"
    }
}
```

### Example with Query Parameters

```json
{
    "$schema": "https://altinncdn.no/schemas/json/prefill/prefill.schema.v1.json",
    "allowOverwrite": true,
    "QueryParameters": {
        "applicationId": "Application.Id",
        "referenceNumber": "Application.ReferenceNumber"
    }
}
```

## BEST PRACTICES

1. Only include the fields you need to prefill
2. Use the exact field names from the data sources as listed in the reference sections above
3. Ensure the target field paths match your data model structure
4. Consider setting `allowOverwrite` to `false` if you want to preserve user-entered data
5. Be aware that prefill will fail if the required data source is not available (e.g., trying to prefill ER data without an organization context)
6. For dynamic prefill scenarios where the data source might not be available, consider using custom prefill implementation
7. Use the JSON schema for validation and intellisense support in your editor

## TROUBLESHOOTING

- If prefill is not working, verify that the field names match exactly with the available values listed in the reference sections
- Ensure that the data model structure matches the target paths in your prefill configuration
- Check that the appropriate context (person/organization) is available for DSF/ER prefill
- Validate your JSON structure using the provided schema

### Common Errors

1. **Using a non-existent "User" data source**: There is no "User" data source in Altinn prefill. Use UserProfile instead.

   ```json
   // INCORRECT
   "User": { "FirstName": "Person.FirstName" }
   
   // CORRECT
   "UserProfile": { "FirstName": "Person.FirstName" }
   ```

2. **Using DSF for the logged-in user**: DSF contains information about the represented person, not the logged-in user.

   ```json
   // INCORRECT - When trying to get the logged-in user's name
   "DSF": { "FirstName": "Submitter.FirstName" }
   
   // CORRECT - For the logged-in user's name
   "UserProfile": { "FirstName": "Submitter.FirstName" }
   ```

3. **Not using Party for universal access**: The UserProfile.Party object provides access to all data regardless of context.

   ```json
   // BETTER APPROACH - Works in all contexts
   "UserProfile": { "Party.Person.FirstName": "Person.FirstName" }
   ```

## CUSTOM PREFILL

When standard prefill sources (DSF, ER, UserProfile, QueryParameters) are not sufficient or when you need to handle cases where a requested prefill type might not be available, you can implement custom prefill.

TODO: Add description of custom prefill.
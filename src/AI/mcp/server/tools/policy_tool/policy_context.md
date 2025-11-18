# ALTINN POLICY STRUCTURE AND RULES
## CRITICAL REQUIREMENT
Important that the roles and access controls are only added if they are specified in the query.
Only roles or access controls specified can be used.
Add requirements for one role at a time
- **Important:** Only add the access control that is required in the prompt. Nothing else!!!

## FILE STRUCTURE
policy.xml is written as eXtensible Access Control Markup Language (XACML) Version 3.0
The container policy (Policy: `<xacml:Policy></xacml:Policy>`) has two major subcontainers:
- Rule: `<xacml:Rule></xacml:Rule>` can be more than one rule in a policy
- ObligationExpressions: `<xacml:ObligationExpressions></xacml:ObligationExpressions>`

**Important:** The policy.xml file should not contain any XML comments (<!-- comment -->). All comments and documentation should be kept outside the file.

### Overall XACML Policy Structure
In a XACML policy file, the structure must follow a specific order:

1. The policy begins with the `<xacml:Policy>` root element containing policy metadata (PolicyId, Version, RuleCombiningAlgId)
2. All rules (`<xacml:Rule>` elements) must be grouped together in the first part of the policy
3. The obligation expressions (`<xacml:ObligationExpressions>` element) must come after all the rules
4. The policy ends with the closing `</xacml:Policy>` tag

**Example of proper structure:**

```xml
<xacml:Policy xmlns:xacml="urn:oasis:names:tc:xacml:3.0:core:schema:wd-17" PolicyId="urn:altinn:example:policyid:1" Version="1.0" RuleCombiningAlgId="urn:oasis:names:tc:xacml:3.0:rule-combining-algorithm:permit-overrides">
  <!-- All rules are grouped together first -->
  <xacml:Rule RuleId="urn:altinn:example:ruleid:1" Effect="Permit">
    <!-- Rule 1 content -->
  </xacml:Rule>
  
  <xacml:Rule RuleId="urn:altinn:example:ruleid:2" Effect="Permit">
    <!-- Rule 2 content -->
  </xacml:Rule>
  
  <!-- Additional rules... -->
  
  <!-- ObligationExpressions come after all rules -->
  <xacml:ObligationExpressions>
    <!-- Obligation expressions content -->
  </xacml:ObligationExpressions>
</xacml:Policy>
```

This structure is critical for proper policy evaluation. Placing rules after obligation expressions or mixing them throughout the policy file can lead to parsing errors or incorrect policy evaluation.

### 1. Rule
Each rule has a description and a target. The rule ID (`RuleId`) should be a unique number (preferably the next number in sequence) and not text. For example, use `"urn:altinn:example:ruleid:5"` instead of `"urn:altinn:example:ruleid:new_rule"`. 

The target consists of anyOf and allOf subcontainers that specify the role the rule affects, the access control the rule affects, and which resources the rules give access to.

**Structure:**

A rule in XACML has the following hierarchical structure:

```xml
<xacml:Rule>
  <xacml:Description> <!-- Human-readable description of the rule --> </xacml:Description>
  <xacml:Target>
    <!-- Section 1: Role definitions (Who) -->
    <xacml:AnyOf> <!-- First AnyOf block is for roles -->
      <xacml:AllOf> <!-- Each AllOf block represents one role -->
        <xacml:Match> <!-- Match element contains the role code -->
          <!-- Role code and attributes -->
        </xacml:Match>
      </xacml:AllOf>
      <!-- Additional AllOf blocks for other roles if needed -->
    </xacml:AnyOf>
    
    <!-- Section 2: Resource definitions (What) -->
    <xacml:AnyOf> <!-- Second AnyOf block is for resources -->
      <xacml:AllOf> <!-- Each AllOf block represents one resource -->
        <xacml:Match> <!-- Match elements for the resource -->
          <!-- Resource attributes -->
        </xacml:Match>
      </xacml:AllOf>
    </xacml:AnyOf>
    
    <!-- Section 3: Action definitions (How) -->
    <xacml:AnyOf> <!-- Third AnyOf block is for actions/permissions -->
      <xacml:AllOf> <!-- Each AllOf block represents one action/permission -->
        <xacml:Match> <!-- Match element for the action -->
          <!-- Action attributes (read, write, etc.) -->
        </xacml:Match>
      </xacml:AllOf>
      <!-- Additional AllOf blocks for other actions -->
    </xacml:AnyOf>
  </xacml:Target>
</xacml:Rule>
```

This structure defines:
1. **Who** - The roles that have permissions (First AnyOf block)
2. **What** - The resources they have access to (Second AnyOf block)
3. **How** - The actions they can perform (Third AnyOf block)

**Example:**

```xml
<xacml:Rule RuleId="urn:altinn:example:ruleid:4" Effect="Permit">
    <xacml:Description>Daglig leder har tilgang til å lese, starte og fulleføre skjema</xacml:Description>
    <xacml:Target>
      <xacml:AnyOf>
        <xacml:AllOf>
          <xacml:Match MatchId="urn:oasis:names:tc:xacml:3.0:function:string-equal-ignore-case">
            <xacml:AttributeValue DataType="http://www.w3.org/2001/XMLSchema#string">DAGL</xacml:AttributeValue>
            <xacml:AttributeDesignator AttributeId="urn:altinn:org" Category="urn:oasis:names:tc:xacml:1.0:subject-category:access-subject" DataType="http://www.w3.org/2001/XMLSchema#string" MustBePresent="false" />
          </xacml:Match>
        </xacml:AllOf>
      </xacml:AnyOf>
      <xacml:AnyOf>
        <xacml:AllOf>
          <xacml:Match MatchId="urn:oasis:names:tc:xacml:1.0:function:string-equal">
            <xacml:AttributeValue DataType="http://www.w3.org/2001/XMLSchema#string">[ORG]</xacml:AttributeValue>
            <xacml:AttributeDesignator AttributeId="urn:altinn:org" Category="urn:oasis:names:tc:xacml:3.0:attribute-category:resource" DataType="http://www.w3.org/2001/XMLSchema#string" MustBePresent="false" />
          </xacml:Match>
          <xacml:Match MatchId="urn:oasis:names:tc:xacml:1.0:function:string-equal">
            <xacml:AttributeValue DataType="http://www.w3.org/2001/XMLSchema#string">[APP]</xacml:AttributeValue>
            <xacml:AttributeDesignator AttributeId="urn:altinn:app" Category="urn:oasis:names:tc:xacml:3.0:attribute-category:resource" DataType="http://www.w3.org/2001/XMLSchema#string" MustBePresent="false" />
          </xacml:Match>
        </xacml:AllOf>
      </xacml:AnyOf>
      <xacml:AnyOf>
        <xacml:AllOf>
          <xacml:Match MatchId="urn:oasis:names:tc:xacml:3.0:function:string-equal-ignore-case">
            <xacml:AttributeValue DataType="http://www.w3.org/2001/XMLSchema#string">read</xacml:AttributeValue>
            <xacml:AttributeDesignator AttributeId="urn:oasis:names:tc:xacml:1.0:action:action-id" Category="urn:oasis:names:tc:xacml:3.0:attribute-category:action" DataType="http://www.w3.org/2001/XMLSchema#string" MustBePresent="false" />
          </xacml:Match>
        </xacml:AllOf>
        <xacml:AllOf>
          <xacml:Match MatchId="urn:oasis:names:tc:xacml:3.0:function:string-equal-ignore-case">
            <xacml:AttributeValue DataType="http://www.w3.org/2001/XMLSchema#string">instantiate</xacml:AttributeValue>
            <xacml:AttributeDesignator AttributeId="urn:oasis:names:tc:xacml:1.0:action:action-id" Category="urn:oasis:names:tc:xacml:3.0:attribute-category:action" DataType="http://www.w3.org/2001/XMLSchema#string" MustBePresent="false" />
          </xacml:Match>
        </xacml:AllOf>
        <xacml:AllOf>
          <xacml:Match MatchId="urn:oasis:names:tc:xacml:3.0:function:string-equal-ignore-case">
            <xacml:AttributeValue DataType="http://www.w3.org/2001/XMLSchema#string">complete</xacml:AttributeValue>
            <xacml:AttributeDesignator AttributeId="urn:oasis:names:tc:xacml:1.0:action:action-id" Category="urn:oasis:names:tc:xacml:3.0:attribute-category:action" DataType="http://www.w3.org/2001/XMLSchema#string" MustBePresent="false" />
          </xacml:Match>
        </xacml:AllOf>
      </xacml:AnyOf>
    </xacml:Target>
</xacml:Rule>
```


### 2. ObligationExpressions
ObligationExpressions consists of one or more ObligationExpression


**Example:**

```xml
<xacml:ObligationExpressions>
    <xacml:ObligationExpression ObligationId="urn:altinn:obligation:authenticationLevel1" FulfillOn="Permit">
        <xacml:AttributeAssignmentExpression AttributeId="urn:altinn:obligation1-assignment1" Category="urn:altinn:minimum-authenticationlevel">
        <xacml:AttributeValue DataType="http://www.w3.org/2001/XMLSchema#integer">4</xacml:AttributeValue>
        </xacml:AttributeAssignmentExpression>
    </xacml:ObligationExpression>
    <xacml:ObligationExpression ObligationId="urn:altinn:obligation:authenticationLevel2" FulfillOn="Permit">
        <xacml:AttributeAssignmentExpression AttributeId="urn:altinn:obligation2-assignment2" Category="urn:altinn:minimum-authenticationlevel-org">
        <xacml:AttributeValue DataType="http://www.w3.org/2001/XMLSchema#integer">3</xacml:AttributeValue>
        </xacml:AttributeAssignmentExpression>
    </xacml:ObligationExpression>
</xacml:ObligationExpressions>
```

## VARIABLES

### Roles
Roles is who has authorization, and is specified first in each rule. 
All possible roles are defined in [all_roles](#list-of-all-possible-roles). 
Relevant keys to focus on in roles are:
- RoleName : string , used to find best match from user prompt
- RoleDescription : string , used to find best match from user prompt
- RoleDefinitionCode : string , this is the code used in the policy.xml file
When getting a prompt, find the role that best matches the user prompt, based on RoleName and RoleDescription

### Access control
Access control is what the role has authorization to do. 
It is **important** that the rule only includes the access controls **specified** in the user prompt. 
The access control are chosen based on best match from the user prompt.
The list of all access_controls are:
access_controls = ["access", "complete", "confirm", "delete", "instantiate", "pay", "publish", "reject", "scopeaccess", "sign", "subscribe", "write"]

### Resources
Resources is what the role has authorization to access. 
Resources are specified in the rule.
The list of all resources are:
    {"attribute": "urn:altinn:org", "description": "The org part of the resource attribute defines which org that owns the app.", "code":"[ORG]"},
    {"attribute": "urn:altinn:app", "description": "The app part that identifies the app itself.", "code":"[APP]"},
    {"attribute": "urn:altinn:task", "description": "The task part of the resource makes it possible to have separate rules for the different tasks.", "code":"taskname"},
    {"attribute": "urn:altinn:event", "description": "The event part of the resource makes it possible to have separate rules for reading events.", "code":"eventname"}

## EDITING GUIDELINES

### Creating New Rules
When creating a new rule, always ensure you include both the opening and closing tags for the rule element. A rule must always start with `<xacml:Rule>` and end with `</xacml:Rule>`. Missing either tag will break the XML structure of the policy file.

**Important:** 
- Always create the complete rule structure with all required elements
- Ensure proper nesting of all XML elements
- Include both opening and closing tags for every element
- Place new rules before the ObligationExpressions section
- Assign a unique numeric RuleId (e.g., `"urn:altinn:example:ruleid:5"`)

### Modifying Rules with Multiple Roles
When a rule affects multiple roles and you need to modify permissions for only some of those roles:

1. **Remove role from original rule** that contains multiple roles
2. **Create a new rule** specifically for the role(s) that need different permissions
3. Ensure the new rule has:
   - A unique RuleId
   - Only the specific role(s) that need different permissions
   - The exact resources and actions needed for those roles

**Example scenario:**
If a rule gives read and write access to both DAGL (Daglig leder) and REGNA (Regnskapsmedarbeider), and you need to add delete access only for DAGL, you should:
1. Remove DAGL (Daglig leder) from the original rule
2. Create a new rule that gives orgininal acesses + delete access to DAGL (Daglig leder)

**Important:** Do not remove a role from the original rule, only remove the role that you want to modify.

### Adding new authorization rule
1. Use keys RoleName and RoleDescription in [all_roles](#list-of-all-possible-roles) to find the best role match to the user prompt
2. Get relevant authorization (rettigheter) **from access_controls** based on prompt
3. Add new authorization to the role
    - Only add the authorization specified in the prompt
    - If the prompt states that authorization is supposed to only be for one specific role, [remove authorization from other roles](#removing-access-control-from-role)
NB: Do not create a new policy file, use the existing policy.xml file

### Removing access control from role
When removing a specific access control from a role, you must remove the entire `<xacml:AllOf>` block that contains that access control. Each access control is contained within its own `<xacml:AllOf>` block inside the actions `<xacml:AnyOf>` section.

**Important:** Do not just remove the `<xacml:Match>` element, as this will break the XML structure. You must remove the complete `<xacml:AllOf>` block that contains the access control you want to remove.

**Steps for removing access:**

1. Find the rule in policy.xml that contains the relevant role (in the first `<xacml:AnyOf>` section)
2. Locate the specific access control to remove in the third `<xacml:AnyOf>` section (the actions section)
3. Remove the entire `<xacml:AllOf>` block containing that access control
4. If all access controls are removed (all `<xacml:AllOf>` blocks in the actions section), remove the entire rule from the policy

**Example:**
Before removing "delete" access: 
```xml
  <xacml:Rule RuleId="urn:altinn:example:ruleid:4" Effect="Permit">
    <xacml:Description>priv has access to read, write and delete</xacml:Description>
    <xacml:Target>
      <xacml:AnyOf>
        <xacml:AllOf>
          <xacml:Match MatchId="urn:oasis:names:tc:xacml:3.0:function:string-equal-ignore-case">
            <xacml:AttributeValue DataType="http://www.w3.org/2001/XMLSchema#string">priv</xacml:AttributeValue>
            <xacml:AttributeDesignator AttributeId="urn:altinn:rolecode" Category="urn:oasis:names:tc:xacml:1.0:subject-category:access-subject" DataType="http://www.w3.org/2001/XMLSchema#string" MustBePresent="false" />
          </xacml:Match>
        </xacml:AllOf>
      </xacml:AnyOf>
      <xacml:AnyOf>
        <xacml:AllOf>
          <xacml:Match MatchId="urn:oasis:names:tc:xacml:1.0:function:string-equal">
            <xacml:AttributeValue DataType="http://www.w3.org/2001/XMLSchema#string">[ORG]</xacml:AttributeValue>
            <xacml:AttributeDesignator AttributeId="urn:altinn:org" Category="urn:oasis:names:tc:xacml:3.0:attribute-category:resource" DataType="http://www.w3.org/2001/XMLSchema#string" MustBePresent="false" />
          </xacml:Match>
          <xacml:Match MatchId="urn:oasis:names:tc:xacml:1.0:function:string-equal">
            <xacml:AttributeValue DataType="http://www.w3.org/2001/XMLSchema#string">[APP]</xacml:AttributeValue>
            <xacml:AttributeDesignator AttributeId="urn:altinn:app" Category="urn:oasis:names:tc:xacml:3.0:attribute-category:resource" DataType="http://www.w3.org/2001/XMLSchema#string" MustBePresent="false" />
          </xacml:Match>
        </xacml:AllOf>
      </xacml:AnyOf>
      <xacml:AnyOf>
        <xacml:AllOf>
          <xacml:Match MatchId="urn:oasis:names:tc:xacml:3.0:function:string-equal-ignore-case">
            <xacml:AttributeValue DataType="http://www.w3.org/2001/XMLSchema#string">write</xacml:AttributeValue>
            <xacml:AttributeDesignator AttributeId="urn:oasis:names:tc:xacml:1.0:action:action-id" Category="urn:oasis:names:tc:xacml:3.0:attribute-category:action" DataType="http://www.w3.org/2001/XMLSchema#string" MustBePresent="false" />
          </xacml:Match>
        </xacml:AllOf>
        <xacml:AllOf>
          <xacml:Match MatchId="urn:oasis:names:tc:xacml:3.0:function:string-equal-ignore-case">
            <xacml:AttributeValue DataType="http://www.w3.org/2001/XMLSchema#string">read</xacml:AttributeValue>
            <xacml:AttributeDesignator AttributeId="urn:oasis:names:tc:xacml:1.0:action:action-id" Category="urn:oasis:names:tc:xacml:3.0:attribute-category:action" DataType="http://www.w3.org/2001/XMLSchema#string" MustBePresent="false" />
          </xacml:Match>
        </xacml:AllOf>
        <xacml:AllOf>
          <xacml:Match MatchId="urn:oasis:names:tc:xacml:3.0:function:string-equal-ignore-case">
            <xacml:AttributeValue DataType="http://www.w3.org/2001/XMLSchema#string">delete</xacml:AttributeValue>
            <xacml:AttributeDesignator AttributeId="urn:oasis:names:tc:xacml:1.0:action:action-id" Category="urn:oasis:names:tc:xacml:3.0:attribute-category:action" DataType="http://www.w3.org/2001/XMLSchema#string" MustBePresent="false" />
          </xacml:Match>
        </xacml:AllOf>
      </xacml:AnyOf>
    </xacml:Target>
  </xacml:Rule>
```
after removing "delete" access: 
```xml
  <xacml:Rule RuleId="urn:altinn:example:ruleid:4" Effect="Permit">
    <xacml:Description>priv has access to read, write and delete</xacml:Description>
    <xacml:Target>
      <xacml:AnyOf>
        <xacml:AllOf>
          <xacml:Match MatchId="urn:oasis:names:tc:xacml:3.0:function:string-equal-ignore-case">
            <xacml:AttributeValue DataType="http://www.w3.org/2001/XMLSchema#string">priv</xacml:AttributeValue>
            <xacml:AttributeDesignator AttributeId="urn:altinn:rolecode" Category="urn:oasis:names:tc:xacml:1.0:subject-category:access-subject" DataType="http://www.w3.org/2001/XMLSchema#string" MustBePresent="false" />
          </xacml:Match>
        </xacml:AllOf>
      </xacml:AnyOf>
      <xacml:AnyOf>
        <xacml:AllOf>
          <xacml:Match MatchId="urn:oasis:names:tc:xacml:1.0:function:string-equal">
            <xacml:AttributeValue DataType="http://www.w3.org/2001/XMLSchema#string">[ORG]</xacml:AttributeValue>
            <xacml:AttributeDesignator AttributeId="urn:altinn:org" Category="urn:oasis:names:tc:xacml:3.0:attribute-category:resource" DataType="http://www.w3.org/2001/XMLSchema#string" MustBePresent="false" />
          </xacml:Match>
          <xacml:Match MatchId="urn:oasis:names:tc:xacml:1.0:function:string-equal">
            <xacml:AttributeValue DataType="http://www.w3.org/2001/XMLSchema#string">[APP]</xacml:AttributeValue>
            <xacml:AttributeDesignator AttributeId="urn:altinn:app" Category="urn:oasis:names:tc:xacml:3.0:attribute-category:resource" DataType="http://www.w3.org/2001/XMLSchema#string" MustBePresent="false" />
          </xacml:Match>
        </xacml:AllOf>
      </xacml:AnyOf>
      <xacml:AnyOf>
        <xacml:AllOf>
          <xacml:Match MatchId="urn:oasis:names:tc:xacml:3.0:function:string-equal-ignore-case">
            <xacml:AttributeValue DataType="http://www.w3.org/2001/XMLSchema#string">write</xacml:AttributeValue>
            <xacml:AttributeDesignator AttributeId="urn:oasis:names:tc:xacml:1.0:action:action-id" Category="urn:oasis:names:tc:xacml:3.0:attribute-category:action" DataType="http://www.w3.org/2001/XMLSchema#string" MustBePresent="false" />
          </xacml:Match>
        </xacml:AllOf>
        <xacml:AllOf>
          <xacml:Match MatchId="urn:oasis:names:tc:xacml:3.0:function:string-equal-ignore-case">
            <xacml:AttributeValue DataType="http://www.w3.org/2001/XMLSchema#string">read</xacml:AttributeValue>
            <xacml:AttributeDesignator AttributeId="urn:oasis:names:tc:xacml:1.0:action:action-id" Category="urn:oasis:names:tc:xacml:3.0:attribute-category:action" DataType="http://www.w3.org/2001/XMLSchema#string" MustBePresent="false" />
          </xacml:Match>
        </xacml:AllOf>
      </xacml:AnyOf>
    </xacml:Target>
  </xacml:Rule>
```


## MANDATORY VALIDATION CHECKLIST
- [ ] Only add the authorization / access control specified in the prompt
- [ ] Add only one role / authorization at a time
- [ ] If the prompt states that authorization is supposed to only be for one specific role, remove authorization from other roles

## LIST OF ALL POSSIBLE ROLES
List of all roles are:
all_roles = [
    {
        "RoleType": "Altinn",
        "RoleDefinitionId": 11,
        "RoleName": "Utfyller/Innsender",
        "RoleDescription": "Denne rollen gir rettighet til et bredt utvalg skjema og tjenester som ikke har så strenge krav til autorisasjon. Ved regelverksendringer eller innføring av nye digitale tjenester kan det bli endringer i tilganger som rollen gir.",
        "RoleDefinitionCode": "UTINN",
        "ParentRoleDefinitionIds": [82, 117, 122, 123, 125, 126, 127, 138, 139, 143, 152, 154, 155, 156, 158, 160, 161],
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/11"
          }
        }
    },
    
    {
        "RoleType": "Altinn",
        "RoleDefinitionId": 13686,
        "RoleName": "Regnskapsfører med signeringsrettighet",
        "RoleDescription": "Denne rollen gir regnskapsfører rettighet til aktuelle skjema og tjenester, samt signeringsrettighet for tjenestene. Ved regelverksendringer eller innføring av nye digitale tjenester kan det bli endringer i tilganger som rollen gir.\r\n",
        "RoleDefinitionCode": "A0239",
        "ParentRoleDefinitionIds": [157],
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/13686"
          }
        }
    },
    {
        "RoleType": "Altinn",
        "RoleDefinitionId": 13687,
        "RoleName": "Regnskapsfører uten signeringsrettighet",
        "RoleDescription": "Denne rollen gir regnskapsfører rettighet til aktuelle skjema og tjenester. Denne gir ikke rettighet til å signere. Ved regelverksendringer eller innføring av nye digitale tjenester kan det bli endringer i tilganger som rollen gir.",
        "RoleDefinitionCode": "A0240",
        "ParentRoleDefinitionIds": [157],
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/13687"
          }
        }
    },
    {
        "RoleType": "Altinn",
        "RoleDefinitionId": 8,
        "RoleName": "Begrenset signeringsrettighet",
        "RoleDescription": "Tilgang til å signere utvalgte skjema og tjenester. Ved regelverksendringer eller innføring av nye digitale tjenester kan det bli endringer i tilganger som rollen gir.",
        "RoleDefinitionCode": "SISKD",
        "ParentRoleDefinitionIds": [82, 117, 122, 125, 138, 139, 143, 151, 152, 155, 156, 158, 160, 161],
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/8"
          }
        }
    },
    {
        "RoleType": "Altinn",
        "RoleDefinitionId": 6,
        "RoleName": "Regnskapsmedarbeider",
        "RoleDescription": "Denne rollen gir rettighet til regnskapsrelaterte skjema og tjenester. Ved regelverksendringer eller innføring av nye digitale tjenester kan det bli endringer i tilganger som rollen gir.",
        "RoleDefinitionCode": "REGNA",
        "ParentRoleDefinitionIds": [82, 117, 122, 123, 125, 126, 127, 138, 139, 143, 150, 151, 152, 155, 156, 158, 160, 161],
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/6"
          }
        }
    },
    {
        "RoleType": "Altinn",
        "RoleDefinitionId": 13684,
        "RoleName": "Ansvarlig revisor",
        "RoleDescription": "Delegerbar revisorrolle med signeringsrettighet.Ved regelverksendringer eller innføring av nye digitale tjenester kan det bli endringer i tilganger som rollen gir.",
        "RoleDefinitionCode": "A0237",
        "ParentRoleDefinitionIds": [159],
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/13684"
          }
        }
    },
    {
        "RoleType": "Altinn",
        "RoleDefinitionId": 13688,
        "RoleName": "Revisormedarbeider",
        "RoleDescription": "Denne rollen gir revisor rettighet til aktuelle skjema og tjenester. Denne gir ikke rettighet til å signere. Ved regelverksendringer eller innføring av nye digitale tjenester kan det bli endringer i tilganger som rollen gir.\r\n",
        "RoleDefinitionCode": "A0238",
        "ParentRoleDefinitionIds": [159],
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/13688"
          }
        }
    },
    {
        "RoleType": "Altinn",
        "RoleDefinitionId": 13685,
        "RoleName": "Regnskapsfører lønn",
        "RoleDescription": "Denne rollen gir regnskapsfører rettighet til lønnsrelaterte tjenester. Ved regelverksendringer eller innføring av nye digitale tjenester kan det bli endringer i tilganger som rollen gir.\r\n",
        "RoleDefinitionCode": "A0241",
        "ParentRoleDefinitionIds": [157],
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/13685"
          }
        }
    },
    {
        "RoleType": "Altinn",
        "RoleDefinitionId": 7,
        "RoleName": "Revisorrettighet",
        "RoleDescription": "Denne rollen gir revisor rettighet til aktuelle skjema og tjenester",
        "RoleDefinitionCode": "REVAI",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/7"
          }
        }
    },
    {
        "RoleType": "External",
        "RoleDefinitionId": 153,
        "RoleName": "Kontaktperson for NUF",
        "RoleDescription": "Kontaktperson for norskregistrert utenlandsk foretak. Ekstern rolle (fra Enhetsregisteret)",
        "RoleDefinitionCode": "KNUF",
        "ChildRoleDefinitionIds": [4, 8031, 11522, 37501],
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/153"
          }
        }
    },
    {
        "RoleType": "External",
        "RoleDefinitionId": 83,
        "RoleName": "Selvregistrert bruker",
        "RoleDescription": "Selvregistrert bruker",
        "RoleDefinitionCode": "SELN",
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/83"
          }
        }
    },
    {
        "RoleType": "External",
        "RoleDefinitionId": 160,
        "RoleName": "Daglig leder",
        "RoleDescription": "Ekstern rolle (fra Enhetsregisteret)",
        "RoleDefinitionCode": "DAGL",
        "ChildRoleDefinitionIds": [3, 4, 6, 8, 10, 11, 12, 15, 85, 86, 87, 91, 92, 95, 2374, 8031, 11522, 13612, 28088, 28997, 35232, 35356, 37500, 37502],
        "_links": {
          "self": {
            "href": "https://www.altinn.no/api/metadata/roledefinitions/160"
          }
        }
    },

]
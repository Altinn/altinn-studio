---
name: studio-policy
description: "Authorization policy of an Altinn app (App/config/authorization/policy.xml): who gets which rights, access packages, roles, service owner rights, actions each process task needs. Use before reading or changing the policy."
---

`App/config/authorization/policy.xml` is the XACML 3.0 policy that decides who may do what with the app's instances.

## App version

The major version of the `Altinn.App.Api` package (or `Altinn.App.Api.Experimental`) in `App/App.csproj` is the
app's version. Before you change
anything, read [references/v8.md](references/v8.md) for a v8 app or [references/v9.md](references/v9.md) for a v9 app.

## How a rule works

- The policy holds `<xacml:Rule Effect="Permit">` elements and then one `<xacml:ObligationExpressions>` element.
- A rule's `<xacml:Target>` has three `<xacml:AnyOf>` elements, in this order: subjects (who), resource (which app,
  and maybe which task), actions (what).
- Each `<xacml:AllOf>` in an AnyOf is one alternative. A rule applies when one AllOf in every AnyOf matches. All
  `<xacml:Match>` elements in one AllOf must match, which is how org, app and task combine.
- `[ORG]`, `[APP]` and `[org]` are placeholders. Studio replaces them with the app's org and name when it deploys,
  and LocalTest does the same. Keep them.
- Studio matches subjects and actions with `string-equal-ignore-case` and resources with `string-equal`.

## Which subject to use

Choose in this order:

1. **Access package**, `urn:altinn:accesspackage`. This is the default for services for organizations. Choose the
   package from what the service is about. Access Management sorts the packages into groups:
   - Allment: general tasks of any organization, such as post, tax, accounts and staff
   - Bransje: one industry, such as construction, health or transport
   - Særskilt: accountants, auditors and business managers acting for a client, and the creditors and the trustee's
     assistant of a bankruptcy estate
   - Innbygger: a person acting for themselves or someone they act for
   - Vergemål: guardianship

   The value is the package code, such as `regnskap-okonomi-rapport`, not the full URN. Daglig leder and the other
   key roles in Enhetsregisteret hold most packages for organizations, so a package rule usually covers them too.
2. **Role from Enhetsregisteret (ER role)**, `urn:altinn:rolecode` with the role code, such as `dagl` or `lede`. ER
   roles keep working after 2026. Use one when the service is for that role in particular.
3. **Private person**, `urn:altinn:rolecode` = `priv`, for a person acting for themselves. A person also holds every
   `innbygger-` package for themselves, so a rule with such a package covers the person and anyone they delegate it
   to.
4. **Service owner**, `urn:altinn:org` = `[org]` in the subject category. The version file says which rights the
   service owner needs.
5. **Altinn 2 roles**, such as `utinn`, `regna` or `a0239`, last. They stop giving access by the end of 2026. When
   the policy has them, or the user asks for one, read [references/altinn2-roles.md](references/altinn2-roles.md)
   first.

- A system user never matches a role. A service that businesses use from their own systems needs a rule with a
  package.
- `urn:altinn:org` in the subject category matches only the service owner. A role code such as `dagl` with
  `urn:altinn:org` matches nobody.
- Each subject is one AllOf in the first AnyOf. Roles and packages share a rule when they get the same rights.

## The lists of packages and roles

Use the access packages and roles that Studio's policy editor offers. Designer reads them from Altinn Access
Management, and they change without a change to the app, so read them each time, and never write a code you have not
seen there.

- Designer serves the access packages at `/designer/api/<org>/<app>/policy/accesspackageoptions`, by group and area.
  A package's code is the last part of its `urn`. A policy can use a package only when its
  `isResourcePolicyAvailable` is `true`.
- Designer serves the roles a policy can use at `/designer/api/<org>/<app>/policy/subjectoptions`. A role's code is
  the last part of its `legacyUrn`, or of its `urn` when it has no `legacyUrn`, such as `dagl` in
  `urn:altinn:rolecode:dagl`. The list has Altinn 2 roles too: those whose provider code is `sys-altinn2`.

Where a shell is available, one way to search the packages is, with the app's org and name:

```sh
curl -s https://altinn.studio/designer/api/<org>/<app>/policy/accesspackageoptions \
  | jq -r '.[] | .name as $group | .areas[] | .packages[] | select(.isResourcePolicyAvailable)
      | [$group, (.urn | split(":") | last), .name] | @tsv' | grep -i 'regnskap'
```

## Attributes

| Part | AttributeId | Category | Value |
|---|---|---|---|
| Access package | `urn:altinn:accesspackage` | subject | Package code |
| Role | `urn:altinn:rolecode` | subject | Role code, such as `dagl` or `priv` |
| Service owner | `urn:altinn:org` | subject | `[org]` |
| App | `urn:altinn:org` and `urn:altinn:app`, in one AllOf | resource | `[ORG]` and `[APP]` |
| Task | `urn:altinn:task`, in the AllOf with org and app | resource | Task ID from `process.bpmn` |
| Ended process | `urn:altinn:end-event`, in the AllOf with org and app | resource | End event ID, such as `EndEvent_1` |
| Events | `urn:altinn:appresource`, in the AllOf with org and app | resource | `events`, with the action `read` |
| Action | `urn:oasis:names:tc:xacml:1.0:action:action-id` | action | `read`, `write` and so on |

The categories in full:

- subject: `urn:oasis:names:tc:xacml:1.0:subject-category:access-subject`
- resource: `urn:oasis:names:tc:xacml:3.0:attribute-category:resource`
- action: `urn:oasis:names:tc:xacml:3.0:attribute-category:action`

Notes:

- A rule without a task or end event applies in every state of the instance. A rule with `urn:altinn:task` applies
  only while the instance is in that task. After the process ends, Altinn checks the end event instead of a task, so
  rules scoped to a task stop matching. Users who should read their submitted instances need a rule without a task,
  or one scoped to the end event.
- Starting an instance has no task yet, so give `instantiate` in a rule without a task.
- Events use `urn:altinn:appresource` = `events`. The docs pages on app authorization show `urn:altinn:event`, which
  nothing reads. Altinn checks events without a task or end event, so an events rule must not have one.
- The authentication level is an obligation, not a rule. `urn:altinn:minimum-authenticationlevel` sets it for
  users and `urn:altinn:minimum-authenticationlevel-org` for the service owner. Change them only when the user asks.
- When users need level 4, Studio can let system users in at level 3 with
  `urn:altinn:minimum-authenticationlevel-systemuser` = `3`. Studio removes it whenever the users' level changes,
  because it lets more users in. Do the same, and ask whether system users should still get in at level 3.

## A complete rule

This is the form Studio's policy editor writes. It gives the access package `regnskap-okonomi-rapport` the rights
`read` and `write` in every task.

```xml
<xacml:Rule RuleId="urn:altinn:example:ruleid:3" Effect="Permit">
  <xacml:Description>Regel for sluttbruker: Gir rettighetene Les og Skriv til brukere med tilgangspakken Regnskap og økonomirapportering, for hele tjenesten.</xacml:Description>
  <xacml:Target>
    <xacml:AnyOf>
      <xacml:AllOf>
        <xacml:Match MatchId="urn:oasis:names:tc:xacml:3.0:function:string-equal-ignore-case">
          <xacml:AttributeValue DataType="http://www.w3.org/2001/XMLSchema#string">regnskap-okonomi-rapport</xacml:AttributeValue>
          <xacml:AttributeDesignator AttributeId="urn:altinn:accesspackage" Category="urn:oasis:names:tc:xacml:1.0:subject-category:access-subject" DataType="http://www.w3.org/2001/XMLSchema#string" MustBePresent="false" />
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
          <xacml:AttributeValue DataType="http://www.w3.org/2001/XMLSchema#string">write</xacml:AttributeValue>
          <xacml:AttributeDesignator AttributeId="urn:oasis:names:tc:xacml:1.0:action:action-id" Category="urn:oasis:names:tc:xacml:3.0:attribute-category:action" DataType="http://www.w3.org/2001/XMLSchema#string" MustBePresent="false" />
        </xacml:Match>
      </xacml:AllOf>
    </xacml:AnyOf>
  </xacml:Target>
</xacml:Rule>
```

To scope a rule to a task, add a third Match with `urn:altinn:task` to the AllOf that holds org and app.

## Editing rules

- Put a new rule after the last rule and before `<xacml:ObligationExpressions>`.
- Give a new rule a new `RuleId`: the prefix the other rules use, ending in the number after the highest one. Studio
  reads the number after the last colon.
- Write only `Effect="Permit"` rules, with no `<xacml:Condition>`. When Studio's policy editor saves, it makes every
  rule Permit and drops conditions.
- Studio's process editor adds a rule for each payment task, with no subjects and a `RuleId` that ends in the task ID.
  It removes the rule by that `RuleId` when the task is removed, so keep it. A rule with no subjects matches everyone,
  so add the subjects that should pay to it.
- To remove an action, remove its whole `<xacml:AllOf>` from the actions AnyOf. Remove a subject the same way. Remove
  the rule when it has no action or no subject left.
- When one subject in a rule needs other rights than the rest, remove its AllOf from that rule. Then add a new rule
  for it with the rights it should have. The other subjects keep their rights.
- Add only the subjects and rights the user asked for. If the request leaves out a right the process needs, say so and
  ask.
- Write no XML comments. Studio's policy editor writes the whole file again from its own model when it saves, and
  drops them. Put the reason for a rule in its `<xacml:Description>`.

## Rights the process needs

When a user moves an instance on from a task without naming an action, the app accepts one of these actions on that
task:

| Task type | Action |
|---|---|
| `data`, `feedback` | `write` |
| `confirmation` | `confirm` |
| `signing` | `sign` or `write` |
| `payment` | `pay` or `write` |
| Service tasks `pdf`, `eFormidling`, `fiksArkiv`, `subformPdf` | `write` |
| Any other user task type | An action named exactly like the task type. `write` does not grant it. |

- The table covers only moving on. Signing needs `sign`, and a payment task needs more actions from users and the
  service owner. The signing and payment guides that the version file links to list them.
- A button that moves the process with an action, such as `reject` on a signing task, needs that action on the
  task in the policy. `ActionButton`, the server actions of `CustomButton`, and the signing and confirm buttons check
  the user's rights, and they know only `read`, `write` and the actions listed on the task in `process.bpmn`. So list
  the action there too. The app also skips validation on `reject` only when the task lists `reject`. The
  `studio-process` skill covers the process side.
- Users also need `instantiate` to start an instance and `read` to see it.
- A user rule scoped to tasks must name every task the user acts on. The version file says what users need on
  service tasks.

## Before you finish

- The file is well-formed XML. Every rule has the three AnyOf elements, and every `RuleId` is unique.
- All rules come before `<xacml:ObligationExpressions>`, and the file has no comments.
- Every package code you added is in the editor's list, with `isResourcePolicyAvailable`. Every role code you
  added is one Studio offers, unless the user asked for that role.
- Users get the action from the table above on every task they must complete.
- Tell the user which subjects got which rights, and in which tasks.

## Docs

- [Tilgangspakker og roller](https://docs.altinn.studio/nb/authorization/what-do-you-get/accesspackages/): what an
  access package gives, and who decides what it covers.
- [Altinn Autorisasjon - Detaljert konsept](https://docs.altinn.studio/nb/authorization/about/detailed/): key roles,
  inherited rights and the end of Altinn 2 roles.

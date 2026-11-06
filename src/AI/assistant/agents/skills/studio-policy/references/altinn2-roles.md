<!-- Maintainers: delete this file and its link in SKILL.md on 1 January 2027, when Altinn 2 roles no longer give access. -->

# Altinn 2 roles

Altinn 2 roles stop giving access by 31 December 2026 at the latest, and some services lose them earlier. After that,
a subject with an Altinn 2 role matches nobody. That includes a daglig leder who reaches the service through `utinn`
today: roles from Enhetsregisteret bring Altinn 2 roles with them now, and that link ends too.

There is no official mapping from Altinn 2 roles to access packages. Digdir asks service owners to choose packages
for each service from what the service is about.

## When the policy has rules with Altinn 2 roles

1. List the rules whose subjects include an Altinn 2 role code, with the role names and the rights each rule gives.
2. Suggest access packages from Access Management's list, as `SKILL.md` describes, that fit what the service is about.
   Read the app's texts and data model to find out. Do not choose a package from the role's name alone: a broad role
   such as `utinn` or `regna` covered many unrelated services.
3. If accountants, auditors or bankruptcy estates used the service for their clients through a role such as `a0239`
   or `a0237`, also suggest the matching package from the Særskilt group.
4. Let the user confirm or change the packages before you change the policy.
5. Add each confirmed package as a subject AllOf in the rule that has the Altinn 2 role, so the package gets the same
   rights. Ask whether to remove the Altinn 2 roles now or leave them until they stop working.

## When the user asks for an Altinn 2 role

Add a rule with an Altinn 2 role only when the user asks for that role. Warn that it stops working by the end of
2026, and suggest an access package for the same purpose.

## Role codes

Access Management's list of roles, which `SKILL.md` names, has the Altinn 2 roles: those whose provider code is
`sys-altinn2`. In a policy they appear as `urn:altinn:rolecode`, in any letter case. Studio's policy editor also
treats `sens` and `sens01` as Altinn 2 roles. Treat them the same way.

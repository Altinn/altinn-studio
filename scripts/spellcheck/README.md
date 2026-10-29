# Spell check

Checks the spelling of code and of the text users read in the product.

| Text                                                          | Language                                  |
| ------------------------------------------------------------- | ----------------------------------------- |
| Code: identifiers, comments, log and exception messages, docs | US English                                |
| Translation keys, since a key is part of the code             | US English                                |
| English translation values                                    | British English                           |
| `nb` and `nn` translation values                              | Bokmål and nynorsk, against Norsk Ordbank |

## Running it

- `yarn spell:quick` checks the files your branch changed. The pre-commit hook in [lefthook.yml](../../lefthook.yml)
  runs it on the staged files.
- `yarn spell:check` checks everything. [CI](../../.github/workflows/spellcheck.yaml) runs the same checks.
- `yarn spell:fix` applies the corrections it is sure of. It also renames misspelled identifiers, so review the diff.
  It cannot tell prose from a value that something else depends on, such as a route, a JSON key, an enum value, a
  migration constant or a CSS module class used from TSX.

Run `typos` only through these scripts. On its own it reports the spellings we have accepted, and
`typos --write-changes` would change them. Compilers do not run the check, so a spelling finding never breaks a
build. CI is the gate.

Test code and test data are out of scope. Do not add exceptions for them.

## When it flags a word

Fix the spelling if you can. Otherwise the exception goes where its kind belongs, and a failing run says where:

- A correct Norwegian word: `glossary.nb.txt` or `glossary.nn.txt`. The dictionaries hold full forms, so add each
  inflection on its own line.
- A correct English word the dictionary lacks: `glossary.en.txt`.
- A name, a quoted identifier or a format that is the same in every language: `glossary.shared.txt`.
- An English spelling that cannot change, such as another system's API: `suppressions.txt`, scoped to the paths and
  identifiers where it is needed, with the reason in a comment.
- A fact about one translation entry, such as an intentionally empty value: `keys.txt`.

Each of these files explains its format in its header. An entry that no longer matches anything is reported as stale,
so exceptions cannot outlive their reason.

## Adding a language file

Register every file with translations in [registry.mjs](registry.mjs). The coverage check finds language files by the
patterns in `SCAN_PATTERNS`, so a file with a new naming convention needs a new pattern in the same change.
Translations written inline in a code file match no pattern and must be registered by hand.

`typos` does not look inside path-shaped string literals, so after you rename a directory, `git grep` for the old
name.

## How it works

[run.mjs](run.mjs) describes the checks. Its rule is that no check may pass without proving that it ran. Each check
counts its work and fails on zero, and the [self-test](selftest/) plants one of every kind of defect and requires
the production configuration to catch each one.

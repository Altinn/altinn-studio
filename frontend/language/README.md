# Language support

We currently are planning to add support for English and Norwegian in Altinn Studio. Since this is not implemented,
this might seem like premature optimization. But we know that this is something that we will add at a point in the future.

This workspace contains the language files and any tests of quality that we might introduce.

The reason that we are not accessing the files directly is simply that we want to have control about formatting of
the language files and might also have to create some special rules when we are building these static assets. So atm
this makes sense. Also just copying the dist-folder directly should be the rule.

## Sorting

We require the text files to be sorted alphabetically by key in order to make it easier to find the text one is looking
for, and to avoid merge conflicts. To sort the files, run the following command from this directory:

```bash
yarn run sort
```

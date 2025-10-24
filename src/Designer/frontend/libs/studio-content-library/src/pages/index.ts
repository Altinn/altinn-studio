import { Landing } from './Landing';
import { CodeListsWithTextResources } from './CodeListsWithTextResources';
import { Images } from './Images';
import type { Page } from './Page';
import { PageName } from '../types/PageName';

export const pages: { [Name in PageName]: Page<Name> } = {
  [PageName.LandingPage]: new Landing(),
  [PageName.CodeListsWithTextResources]: new CodeListsWithTextResources(),
  [PageName.Images]: new Images(),
};

export function getPage<Name extends PageName>(name: Name): Page<Name> {
  return pages[name];
}

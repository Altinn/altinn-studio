import { createSelector } from 'reselect';

const deploymentListSelector = (state: any) => {
  return state.deploy.deploymentList;
};

const getImageTags = () => {
  return createSelector(
    [deploymentListSelector],
    (deploymentList) => {
      return Object.keys(deploymentList)
        .reduce((acc, env) => {
          if (deploymentList[env].items.length > 0) {
            return {
              ...acc,
              [env]: deploymentList[env].items[0].spec.template.spec.containers[0].image.split(':')[1],
            };
          } else {
            return null;
          }
        }, {});
    },
  );
};

export const makeGetImageTags = getImageTags;

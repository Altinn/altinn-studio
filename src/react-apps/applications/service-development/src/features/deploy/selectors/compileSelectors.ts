import { createSelector } from 'reselect';

const compileStatusSelector = (state: IServiceDevelopmentState) => {
  return state.deploy.compileStatus;
};

const getCompileStatus = () => {
  return createSelector(
    [compileStatusSelector],
    (compileStatus) => {
      return compileStatus;
    },
  );
};

const getCompileStatusUniqueFilenames = () => {
  return createSelector(
    [compileStatusSelector],
    (compileStatus) => {
      if (compileStatus.result) {

        // Create array of filnames
        const fileNameArray = compileStatus.result.compilationInfo.map((item: any) => item.fileName).sort();
        // Return the array with unique filenames
        return fileNameArray.filter((item: string, index: number) => {
          return fileNameArray.indexOf(item) === index;
        });

      } else {
        return null;
      }
    },
  );
};

export const makeGetCompileStatusResultSelector = getCompileStatus;
export const makeGetCompileStatusUniqueFilenames = getCompileStatusUniqueFilenames;

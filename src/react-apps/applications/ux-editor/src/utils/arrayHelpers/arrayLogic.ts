import { createSelector } from 'reselect';

export interface IUpdateArrayObj {
  array: any[];
  object: any;
}

export interface ITwoArraysObj {
  array: any[];
  order: any [];
}

const pushOrPop = ({array, object}: IUpdateArrayObj) => {
  const tempObj = array.find((o: any) => o.id === object.id);
  const index = array.indexOf(tempObj);
  if (array.find((o: any) => o.inEditMode === true)) {
    if (tempObj) {
      array[index] = object;
    }
    const cloneOfObj = JSON.parse(JSON.stringify({array, object}));
    return cloneOfObj;
  } else {
    if (!tempObj) {
      array.push(object);
      array.sort(compareOrderNum);
    } else {
      object.inEditMode ? array[index] = object : array.splice(index, 1);
    }
    if (array.length > 0) {
      markFirstAndLastObject(array);
    }
    const cloneOfObj = JSON.parse(JSON.stringify({array, object}));
    return cloneOfObj;
  }
};

const changeOrderNum = ({array, order}: ITwoArraysObj) => {
  array.forEach((component: any) => {
    if (order.indexOf(component.id) >= 0) {
      component.order = order.indexOf(component.id);
    }
  });
  const cloneOfObj = JSON.parse(JSON.stringify({array, order}));
  return cloneOfObj;
};

const compareOrderNum = (a: any, b: any) => {
  if (a.order < b.order) {
    return -1;
  } else if (a.order > b.order) {
    return 1;
  } else if (a.order === b.order) {
    b.order = a.order + 1;
  }
  return 0;
};

const findMissing = (a: any[]) => {
  const maximum = Math.max.apply(Math, a.map((o) => {
    return o.order;
  }));
  const minimum = Math.min.apply(Math, a.map((o) => {
    return o.order;
  }));
  let index = 0;
  Array.from(Array(maximum).keys()).forEach((i: number) => {
    const obj = a.find((x: any) => x.order === i);
    if (obj) {
      index = a.indexOf(obj);
    }
    if (!obj && i > minimum) {
      a[index].lastInActiveList = true;
      a[index + 1].firstInActiveList = true;
    }
  });
  return a;
};

const markFirstAndLastObject = (array: any[]) => {
  for (let i = 0; i <= array.length - 1; i++) {
    if (i === 0 && array.length === 1) {
      array[i].firstInActiveList = true;
      array[i].lastInActiveList = true;
    } else if (i === 0 && array.length > 1) {
      array[i].firstInActiveList = true;
      array[i].lastInActiveList = false;
    } else if (i === array.length - 1) {
      array[i].firstInActiveList = false;
      array[i].lastInActiveList = true;
    } else {
      array[i].firstInActiveList = false;
      array[i].lastInActiveList = false;
    }
  }
  const handleMissingInOrder = findMissing(array);
  return handleMissingInOrder;
};

const getArray = () => {
  return createSelector(
    pushOrPop,
    (obj: IUpdateArrayObj) => {
      return obj.array;
    },
  );
};

const getSortedArray = () => {
  return createSelector(
    changeOrderNum,
    (obj: ITwoArraysObj) => {
      return obj.array;
    },
  );
};

export const addToOrDeleteFromArray = getArray;
export const sortArray = getSortedArray;

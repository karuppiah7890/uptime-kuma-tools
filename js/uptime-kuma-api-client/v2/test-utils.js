const assert = require('assert');

// Example usage:
// const arrayA = [3, 1, 2];
// const arrayB = [2, 3, 1];
// arraysEqualIgnoringOrder(arrayA, arrayB); // This will pass if arrays are equal ignoring order
function arraysEqualIgnoringOrder(array, anotherArray) {
  if (array.length !== anotherArray.length) {
    return false;
  }
  const sortedArray = [...array].sort(); // Create copies to avoid modifying original arrays
  const sortedAnotherArray = [...anotherArray].sort();
  assert.deepStrictEqual(sortedArray, sortedAnotherArray);
  return true; // If deepStrictEqual doesn't throw, they are equal
}

function getMonitorsAndTheirParentsOutputDeepEqualIgnoringArrayOrder(actualOutput, expectedOutput) {
  if (!arraysEqualIgnoringOrder(actualOutput.oldMonitorIDsWithoutParent, expectedOutput.oldMonitorIDsWithoutParent)) {
    return false
  }
  
  const actualOldMonitorIDs = Object.keys(actualOutput.oldMonitorIDsWithTheirChildren)
  const expectedOldMonitorIDs = Object.keys(expectedOutput.oldMonitorIDsWithTheirChildren)

  if (actualOldMonitorIDs.length != expectedOldMonitorIDs.length) {
    return false
  }

  for (const actualOldMonitorID of actualOldMonitorIDs) {
    if (!expectedOldMonitorIDs.includes(actualOldMonitorID) || !arraysEqualIgnoringOrder(actualOutput.oldMonitorIDsWithTheirChildren[actualOldMonitorID], expectedOutput.oldMonitorIDsWithTheirChildren[actualOldMonitorID])) {
      return false;
    }
  }

  return true
}

module.exports = {
    getMonitorsAndTheirParentsOutputDeepEqualIgnoringArrayOrder
}

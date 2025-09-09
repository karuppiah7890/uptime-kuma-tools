function promiseWithTimeout(promise, timeoutMs, timeoutError = new Error('Promise timed out')) {
  // Create a promise that rejects in <timeoutMs> milliseconds
  return new Promise((resolve, reject) => {
    const timeoutPid = setTimeout(() => {
      reject(timeoutError);
    }, timeoutMs);

    promise.then((result) => {
        resolve(result)
    }).catch((error) => {
        reject(error)
    }).finally(() => {
        if (timeoutPid) {
            clearTimeout(timeoutPid)
        }
    })
  });
}

// Usage example:
const myAsyncOperation = new Promise(resolve => {
  setTimeout(() => {
    resolve('Operation completed!');
  }, 10000); // This operation takes 10 seconds
});

promiseWithTimeout(myAsyncOperation, 2000) // Set timeout to 2 seconds
  .then(result => {
    console.log(result); // This won't be reached if timeout occurs
  })
  .catch(error => {
    console.error(error.message); // Will log "Promise timed out"
  });

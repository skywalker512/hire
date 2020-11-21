// generate workers according to concurrency number
// each worker takes the same iterator
// 最终返回的是对应数量同一个 iterator
const limit = concurrency => iterator => {
  // 创建对应数量的 workers
  const workers = new Array(concurrency);
  // 把所有 workers 都用一个东西进行填充
  return workers.fill(iterator);
};

// run tasks in an iterator one by one
// 返回一个接收同一 iterator 的函数，并发执行
const run = func => async iterator => {
  for (const item of iterator) {
    await func(item);
  }
};

// wrap limit and run together
/**
 * 
 * @param {Array} array 
 * @param {*} func 
 * @param {*} concurrency 
 */
function asyncTasks(array, func, concurrency = 1) {
  return limit(concurrency)(array.values()).map(run(func));
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// simulate an async work that takes 1s to finish
async function execute(id) {
  console.log(`start work ${id}`);
  await sleep(1000);
  console.log(`work ${id} done`);
}


Promise.all(asyncTasks([1, 2, 3, 4, 5, 6, 7, 8, 9], execute, 4));
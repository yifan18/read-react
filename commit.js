function performAsyncWork() {
  performWork(NoWork, true);
  didYield = false;
}

function performWork(minExpirationTime, isYieldy) {
  if (isYieldy) {
    while (
      nextFlushedRoot !== null &&
      nextFlushedExpirationTime !== NoWork &&
      minExpirationTime <= nextFlushedExpirationTime &&
      !(didYield && currentRendererTime > nextFlushedExpirationTime)
    ) {
      performWorkOnRoot(
        nextFlushedRoot,
        nextFlushedExpirationTime,
        currentRendererTime > nextFlushedExpirationTime
      );
    }
  } else {
    // sync
  }
  // If there's work left over, schedule a new callback.
  if (nextFlushedExpirationTime !== NoWork) {
    scheduleCallbackWithExpirationTime(
      nextFlushedRoot,
      nextFlushedExpirationTime
    );
  }

  // Clean-up.   ??
  finishRendering();
}

function performWorkOnRoot(root, expirationTime, isYieldy) {
  isRendering = true;

  if (!isYieldy) {
    // ...sync work
  } else {
    // Flush async work.
    var finishedWork = root.finishedWork;
    if (finishedWork !== null) {
      // This root is already complete. We can commit it.
      completeRoot(root, finishedWork, expirationTime);
    } else {
      renderRoot(root, isYieldy);
      finishedWork = root.finishedWork;
      if (finishedWork !== null) {
        // renderding阶段完成 准备commit
        if (!shouldYieldToRenderer()) {
          // Still time left. Commit the root.
          completeRoot(root, finishedWork, expirationTime);
        }
      }
    }
  }

  isRendering = false;
}

// 开启work循环 循环结束后将workInProgress设给root.finishedWork
function renderRoot(root, isYieldy) {
  isWorking = true;

  do {
    try {
      workLoop(isYieldy);
    } catch (thrownValue) {
      // 捕获work unit报错
      resetHooks();

      if (nextUnitOfWork === null) {
        onUncaughtError(thrownValue);
      } else {
        // 如果还有没做完的
        var sourceFiber = nextUnitOfWork;
        var returnFiber = sourceFiber.return;
        if (returnFiber === null) {
          // 已经做到root了
          onUncaughtError(thrownValue);
        } else {
          // 继续做下一个work
          throwException(
            root,
            returnFiber,
            sourceFiber,
            thrownValue,
            nextRenderExpirationTime
          );
          nextUnitOfWork = completeUnitOfWork(sourceFiber);
          continue;
        }
      }
    }
    break;
  } while (true);

  // We're done performing work. Time to clean up.
  isWorking = false;
  resetHooks();

  if (nextUnitOfWork !== null) {
    // rendering阶段未完成 没时间了所以留到下一帧做
    root.finishedWork = null;
    return;
  }

  // Ready to commit.
  const rootWorkInProgress = root.current.alternate;
  root.pendingCommitExpirationTime = expirationTime;
  root.finishedWork = rootWorkInProgress;
}

// 完成root一些结束工作
function completeRoot(root, finishedWork, expirationTime) {
  root.finishedWork = null;
  if (root === lastCommittedRootDuringThisBatch) {
    // 判断嵌套循环 (commit阶段提交的更新)
    nestedUpdateCount++;
  } else {
    lastCommittedRootDuringThisBatch = root;
    nestedUpdateCount = 0;
  }
  commitRoot(root, finishedWork);
}

// 处理生命周期和更新dom
function commitRoot(root, finishedWork) {
  isWorking = true;
  isCommitting = true;

  let firstEffect = finishedWork;
  nextEffect = firstEffect; // effect list副作用链表
  while (nextEffect !== null) {
    commitBeforeMutationLifecycles();
  }

  nextEffect = firstEffect; // 初始化effect list查找位置
  while (nextEffect !== null) {
    commitAllHostEffects(); // 根据effectTag做Placement/PlacementAndUpdate/Update/Deletion
  }

  // 更新fiber tree
  root.current = finishedWork;

  nextEffect = firstEffect;
  while (nextEffect !== null) {
    commitAllLifeCycles(root, committedExpirationTime); // 调用生命周期方法 didmount/didupdate/setStateCallback/refcallback/
  }

  root.expirationTime = expirationTime;
  root.finishedWork = null;
}

function commitBeforeMutationLifecycles() {
  while (nextEffect !== null) {
    const effectTag = nextEffect.effectTag;
    if (effectTag & Snapshot) {
      const current = nextEffect.alternate;
      commitBeforeMutationLifeCycles(current, nextEffect);
    }

    nextEffect = nextEffect.nextEffect;
  }
}

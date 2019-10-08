function workLoop(isYieldy) {
    while (nextUnitOfWork !== null) {
        nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
    }
}

function performUnitOfWork(workInProgress){
    var current = workInProgress.alternate;
    let next = beginWork(current, workInProgress, nextRenderExpirationTime);

    if (next === null) {
        // If this doesn't spawn new work, complete the current work.
        next = completeUnitOfWork(workInProgress);
    }
    ReactCurrentOwner$2.current = null;
    return next
}

function completeUnitOfWork(workInProgress) {
    while(true){
        var current = workInProgress.alternate;   
        var returnFiber = workInProgress.return;
        var siblingFiber = workInProgress.sibling; 
    
        nextUnitOfWork = completeWork(current, workInProgress, nextRenderExpirationTime);    // ?
        if (nextUnitOfWork !== null) {
            return nextUnitOfWork;
        }
    
        if (siblingFiber !== null) {
            return siblingFiber;
        } else if (returnFiber !== null) {
            workInProgress = returnFiber;
            continue;
        } else {
            return null;
        }
    }
}

function beginWork(workInProgress){
    switch(workInProgress.tag){
        case 'ClassComponent': return updateClassComponent(current, workInProgress, workInProgress.type, newProps, ...);
        case 'HostComponent': break;
    }
}

function completeWork(current, workInProgress, renderExpirationTime) {
    var newProps = workInProgress.pendingProps;
    switch(workInProgress.tag){
        case 'ClassComponent':
            break;
        case 'HostRoot':
            break;
        case 'HostComponent':
            var rootContainerInstance = getRootHostContainer();
            updateHostComponent(current, workInProgress, type, newProps, rootContainerInstance);
            break;
    }
}


function updateClassComponent(current, workInProgress, Component, nextProps, renderExpirationTime){
    let shouldUpdate = false;
    let instance = workInProgress.stateNode;
    if(instance === null){  // ?? when 
        // ??
    }else if(current === null){ // ?? when
        // ??
    }else{
        shouldUpdate = updateClassInstance(current, workInProgress, Component, nextProps, renderExpirationTime);
    }

    var nextUnitOfWork = finishClassComponent(current$$1, workInProgress, Component, shouldUpdate, hasContext, renderExpirationTime);
    return nextUnitOfWork
}

function finishClassComponent(current, workInProgress, Component, shouldUpdate, hasContext, renderExpirationTime){
    if (!shouldUpdate) {
        // 结束工作 返回next unit of work
        return bailoutOnAlreadyFinishedWork(current, workInProgress, renderExpirationTime);
    }
      
    let nextChildren = instance.render();
    workInProgress.effectTag |= PerformedWork;
    reconcileChildren(current, workInProgress, nextChildren, renderExpirationTime);
    workInProgress.memoizedState = instance.state;
    return workInProgress.child;
}

function updateClassInstance(current, workInProgress, ctor, newProps, renderExpirationTime){
    let instance = workInProgress.stateNode;

    // try call componentWillReceiveProps
    let oldProps = workInProgress.memoizedProps;
    var hasNewLifecycles = typeof ctor.getDerivedStateFromProps === 'function' || typeof instance.getSnapshotBeforeUpdate === 'function';
    if (!hasNewLifecycles) {
        if (oldProps !== newProps || oldContext !== nextContext) {
          callComponentWillReceiveProps(workInProgress, instance, newProps, nextContext);
        }
    }

    // 拿到newState
    var oldState = workInProgress.memoizedState;
    var newState = instance.state = oldState;
    var updateQueue = workInProgress.updateQueue;
    if (updateQueue !== null) {
      processUpdateQueue(workInProgress, updateQueue, newProps, instance, renderExpirationTime);
      newState = workInProgress.memoizedState;
    }

    // 默认做一层pure 不知道为什么要打tag??
    if (oldProps === newProps && oldState === newState && !hasContextChanged() && !checkHasForceUpdateAfterProcessing()) {
        if (typeof instance.componentDidUpdate === 'function') {
          if (oldProps !== current.memoizedProps || oldState !== current.memoizedState) {
            workInProgress.effectTag |= Update;
          }
        }
        if (typeof instance.getSnapshotBeforeUpdate === 'function') {
          if (oldProps !== current.memoizedProps || oldState !== current.memoizedState) {
            workInProgress.effectTag |= Snapshot;
          }
        }
        return false;
    }

    // 改变newState
    if (typeof getDerivedStateFromProps === 'function') {
        applyDerivedStateFromProps(workInProgress, ctor, getDerivedStateFromProps, newProps);
        newState = workInProgress.memoizedState;
    }

    // 判断全局强制更新标记 | call component.ShouldComponentUpdate
    var shouldUpdate = checkHasForceUpdateAfterProcessing() || checkShouldComponentUpdate(workInProgress, ctor, oldProps, newProps, oldState, newState, nextContext);

    if(shouldUpdate){
        if (!hasNewLifecycles) {
            instance.componentWillUpdate(newProps, newState, nextContext);
            instance.UNSAFE_componentWillUpdate(newProps, newState, nextContext);
          }
          if (typeof instance.componentDidUpdate === 'function') {
            workInProgress.effectTag |= Update;
          }
          if (typeof instance.getSnapshotBeforeUpdate === 'function') {
            workInProgress.effectTag |= Snapshot;
        }
    }else{
        // 不更新为什么也会加tag??
        if (typeof instance.componentDidUpdate === 'function') {
            if (oldProps !== current.memoizedProps || oldState !== current.memoizedState) {
              workInProgress.effectTag |= Update;
            }
          }
          if (typeof instance.getSnapshotBeforeUpdate === 'function') {
            if (oldProps !== current.memoizedProps || oldState !== current.memoizedState) {
              workInProgress.effectTag |= Snapshot;
            }
        }
      
        // 保存新的变量
        workInProgress.memoizedProps = newProps;
        workInProgress.memoizedState = newState;
    }
}

function processUpdateQueue(workInProgress, queue, props, instance, renderExpirationTime) {
    var update = queue.firstUpdate;
    var newBaseState = queue.baseState;
    var resultState = newBaseState;

    while(update){
        if (updateExpirationTime < renderExpirationTime) {  // ?? 比较优先级
            // This update does not have sufficient priority. Skip it.
        }else{
            // This update does have sufficient priority. Process it and compute a new result.

            // 处理每个setState
            resultState = getStateFromUpdate(workInProgress, queue, update, resultState, props, instance);
            var _callback = update.callback;
            if (_callback !== null) {   // 处理callback，给workInProgress加effect标签，并将update对象加入queue的effect list.
                workInProgress.effectTag |= Callback;
                // Set this to null, in case it was mutated during an aborted render.
                update.nextEffect = null;
                if (queue.lastEffect === null) {
                  queue.firstEffect = queue.lastEffect = update;
                } else {
                  queue.lastEffect.nextEffect = update;
                  queue.lastEffect = update;
                }
              }
        }

        update = update.next;
    }

    // while CapturedUpdate ??

    workInProgress.memoizedState = resultState;
}

function reconcileChildren(current, workInProgress, nextChildren, renderExpirationTime){
    if(current === null){
        workInProgress.child = mountChildFibers(workInProgress, null, nextChildren, renderExpirationTime);
    }else{
        workInProgress.child = reconcileChildFibers(workInProgress, current.child, nextChildren, renderExpirationTime);
    }
}

function bailoutOnAlreadyFinishedWork(){
    var childExpirationTime = workInProgress.childExpirationTime;
    if (childExpirationTime < renderExpirationTime) {
      return null;
    } else {
      cloneChildFibers(current, workInProgress);    // ??
      return workInProgress.child;
    }
}

function reconcileChildFibers(returnFiber, currentFirstChild, newChild, expirationTime){
    var isObject = typeof newChild === 'object' && newChild !== null;
    if (isObject && newChild.$$typeof === REACT_ELEMENT_TYPE) {
        return placeSingleChild(reconcileSingleElement(returnFiber, currentFirstChild, newChild, expirationTime));
    }

    if (typeof newChild === 'string' || typeof newChild === 'number') {
        return placeSingleChild(reconcileSingleTextNode(returnFiber, currentFirstChild, '' + newChild, expirationTime));
    }

    if (isArray(newChild)) {
        return reconcileChildrenArray(returnFiber, currentFirstChild, newChild, expirationTime);
    }

    return deleteRemainingChildren(returnFiber, currentFirstChild);
}

function reconcileSingleElement(returnFiber, currentFirstChild, element, expirationTime){
    const key = element.key;
    let child = currentFirstChild;
    while (child !== null) {
        if(child.key === key){
            if(child.elementType === element.type){
                deleteRemainingChildren(returnFiber, child.sibling);    // 把之前该节点存在的兄弟节点都删除掉
                const existing = useFiber(
                  child,
                  element.type === REACT_FRAGMENT_TYPE
                    ? element.props.children
                    : element.props,
                  expirationTime,
                );
                return existing;
            }else{
                deleteRemainingChildren(returnFiber, child);
            }
        }else{
            deleteChild(returnFiber, child);    // 将child作为delete effect挂到returnFiber的lastEffect上
        }
    }

    const created = createFiberFromElement(element, returnFiber.mode, expirationTime);
    created.ref = coerceRef(returnFiber, currentFirstChild, element);
    created.return = returnFiber;
    return created;
}

function reconcileChildrenArray(returnFiber, currentFirstChild, newChildren, expirationTime){

    let resultingFirstChild = null;
    let previousNewFiber = null;    // 上一个新建的fiber node

    let oldFiber = currentFirstChild;    // 当前进行比较的oldfiber node
    let lastPlacedIndex = 0;    // 最后插入索引
    let newIdx = 0; // 基数索引
    let nextOldFiber = null;    // 准备下一个用来比较的oldfiber node
    for (; oldFiber !== null && newIdx < newChildren.length; newIdx++) {
      if (oldFiber.index > newIdx) {
        nextOldFiber = oldFiber;
        oldFiber = null;
      } else {
        nextOldFiber = oldFiber.sibling;
      }
      const newFiber = updateSlot(  // 根据reactElement创建或更新fiber
        returnFiber,
        oldFiber,
        newChildren[newIdx],
        expirationTime,
      );
      if (newFiber === null) {  // 如果返回null 说明key不匹配
        break;
      }
      if (shouldTrackSideEffects) { // update时添加副作用 
        if (oldFiber && newFiber.alternate === null) {  // 如果oldfiber被替换 就删掉oldfiber
          deleteChild(returnFiber, oldFiber);
        }
      }
      lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIdx);  // 设置newfiber的index
      if (previousNewFiber === null) {  // 保存第一个newfiber
        resultingFirstChild = newFiber;
      } else {
        previousNewFiber.sibling = newFiber;    // 设置上一个newfiber的兄弟节点引用
      }
      // 更新变量
      previousNewFiber = newFiber;  
      oldFiber = nextOldFiber;
    }

    if (newIdx === newChildren.length) { // 已经到了新数组的终点 
        deleteRemainingChildren(returnFiber, oldFiber); // 把剩余的节点给删掉
        return resultingFirstChild; // 返回首个fiber
    }

    if (oldFiber === null) {    // 说明之前child是空的 直接往里插
        for (; newIdx < newChildren.length; newIdx++) {
          const newFiber = createChild(
            returnFiber,
            newChildren[newIdx],
            expirationTime,
          );
          if (!newFiber) {
            continue;
          }
          lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIdx);
          if (previousNewFiber === null) {
            // TODO: Move out of the loop. This only happens for the first run.
            resultingFirstChild = newFiber;
          } else {
            previousNewFiber.sibling = newFiber;
          }
          previousNewFiber = newFiber;
        }
        return resultingFirstChild;
    }

    // 为了快速查找 创建oldfiber索引表
    const existingChildren = mapRemainingChildren(returnFiber, oldFiber);

    // 继续接上面由于key不匹配中断的循环
    for (; newIdx < newChildren.length; newIdx++) {
        const newFiber = updateFromMap(existingChildren, returnFiber, newIdx, newChildren[newIdx], expirationTime);
        if (newFiber) {
            if (shouldTrackSideEffects) {
                if (newFiber.alternate !== null) {
                    existingChildren.delete(newFiber.key === null ? newIdx : newFiber.key);
                }
            }
            lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIdx);
            if (previousNewFiber === null) {
                resultingFirstChild = newFiber;
            } else {
                previousNewFiber.sibling = newFiber;
            }
            previousNewFiber = newFiber;
        }
    }

    if (shouldTrackSideEffects) {
        existingChildren.forEach(child => deleteChild(returnFiber, child)); // 删掉没被替换的oldfiber
    }
  
    return resultingFirstChild;

}

function updateSlot(returnFiber, oldFiber, newChild, expirationTime){
    const key = oldFiber !== null ? oldFiber.key : null;
    if (typeof newChild === 'string' || typeof newChild === 'number') {
        if (key !== null) return null;  // 文本节点没有key
        return updateTextNode(returnFiber, oldFiber, '' + newChild, expirationTime);
    }

    if(typeof newChild === 'object' && newChild){
        switch (newChild.$$typeof) {
            case REACT_ELEMENT_TYPE: {
                if (newChild.key === key) {
                    return updateElement(returnFiber, oldFiber, newChild, expirationTime);
                } else {
                    return null;
                }
            }
            case REACT_PORTAL_TYPE: {...} break;
        }
    }
  
    return null;
}



// [✔] 异步调度理清楚了
// [-] 理一下高优先级调度  flushImmediateWork
// [-] 理一下低优先级调度 

function enqueueSetState(inst, payload, callback) {
    var fiber = get(inst);
    var currentTime = requestCurrentTime(); // ??
    var expirationTime = computeExpirationForFiber(currentTime, fiber); // ??

    var update = createUpdate(expirationTime);  // ??
    update.payload = payload;
    if (callback !== undefined && callback !== null) {
        {
            warnOnInvalidCallback$1(callback, 'setState');
        }
        update.callback = callback;
    }

    enqueueUpdate(fiber, update);
    scheduleWork(fiber, expirationTime);
}

function requestCurrentTime() {
    if (isRendering) {
        return currentSchedulerTime;
    }
    findHighestPriorityRoot();    // check if there's pending work.
    if (nextFlushedExpirationTime === NoWork || nextFlushedExpirationTime === Never) {
        recomputeCurrentRendererTime(); // 重新计算currentRendererTime
        currentSchedulerTime = currentRendererTime;
        return currentSchedulerTime;
    }
    return currentSchedulerTime;
}

function scheduleWork(fiber, expirationTime) {
    var root = scheduleWorkToRoot(fiber, expirationTime);
    requestWork(root, root.expirationTime);
}

function requestWork(root, expirationTime) {
    addRootToSchedule(root, expirationTime);    // ??
    if (isRendering) return; // ??
    scheduleCallbackWithExpirationTime(root, expirationTime);
}


function unstable_scheduleCallback(callback, deprecated_options) {
    var newNode = {
        callback: callback,
        priorityLevel: currentPriorityLevel,
        expirationTime: expirationTime,
        next: null,
        previous: null
    };

    if (firstCallbackNode === null) {
        firstCallbackNode = newNode
    } else {
        // 如果有多个callback node，留下expirationTime最长的那一个
    }
    ensureHostCallbackIsScheduled()
}

function ensureHostCallbackIsScheduled() {
    if (isExecutingCallback) return;    // 已经有callback在执行就先等着

    var expirationTime = firstCallbackNode.expirationTime;
    if (!isHostCallbackScheduled) {
        isHostCallbackScheduled = true; // 贴个标记表示任务已经安排了
    } else {
        cancelHostCallback();   // 如果已经安排但是没执行就取消掉
    }
    requestHostCallback(flushWork, expirationTime); // 把callback安排到下一帧
}

function flushWork(didTimeout) {
    isExecutingCallback = true;
    try {
        if (firstCallbackNode !== null) {
            do { flushFirstCallback(); } while (firstCallbackNode !== null && !shouldYieldToHost());
        }
    } finally {
        isExecutingCallback = false;
        currentDidTimeout = previousDidTimeout;
        if (firstCallbackNode !== null) {
            ensureHostCallbackIsScheduled();    // 如果有回调 安排上
        } else {
            isHostCallbackScheduled = false;
        }
        // Before exiting, flush all the immediate work that was scheduled.
        flushImmediateWork();   // ??
    }
}

function flushFirstCallback() {
    var callback = firstCallbackNode.callback;
    callback();
}

function requestHostCallback(callback, absoluteTimeout/* ?? */) {
    scheduledHostCallback = callback;
    timeoutTime = absoluteTimeout;
    if (isFlushingHostCallback || absoluteTimeout < 0) {    // 如果超时就直接执行
        // Don't wait for the next frame. Continue working ASAP, in a new event.
        port.postMessage(undefined);
    } else if (!isAnimationFrameScheduled) {    // 启动帧循环处理callback
        isAnimationFrameScheduled = true;
        requestAnimationFrameWithTimeout(animationTick);
    }
}

function requestAnimationFrameWithTimeout(callback) {
    // schedule rAF and also a setTimeout
    rAFID = localRequestAnimationFrame(function (timestamp) {
        // cancel the setTimeout
        localClearTimeout(rAFTimeoutID);
        callback(timestamp);
    });
    rAFTimeoutID = localSetTimeout(function () {
        // cancel the requestAnimationFrame
        localCancelAnimationFrame(rAFID);
        callback(getCurrentTime());
    }, 100);
};

// 创建帧循环调用 
function animationTick(rafTime) {
    if (scheduledHostCallback !== null) {
        requestAnimationFrameWithTimeout(animationTick);
    } else {
        isAnimationFrameScheduled = false;
        return;
    }

    frameDeadline = rafTime + activeFrameTime;
    if (!isMessageEventScheduled) {
        isMessageEventScheduled = true;
        port.postMessage(undefined);
    }
};

var channel = new MessageChannel();
var port = channel.port2;
channel.port1.onmessage = function (event) {
    isMessageEventScheduled = false;

    var prevScheduledCallback = scheduledHostCallback;
    var prevTimeoutTime = timeoutTime;
    scheduledHostCallback = null;
    timeoutTime = -1;

    var currentTime = getCurrentTime();

    var didTimeout = false;
    if (frameDeadline - currentTime <= 0) {
        if (prevTimeoutTime !== -1 && prevTimeoutTime <= currentTime) {
            didTimeout = true;  // 超时就直接执行
        } else {
            // 没超时
            if (!isAnimationFrameScheduled) {   // 没开帧循环的话开启 放到下一帧执行
                isAnimationFrameScheduled = true;
                requestAnimationFrameWithTimeout(animationTick);
            }
            // 安排到下下帧执行
            scheduledHostCallback = prevScheduledCallback;
            timeoutTime = prevTimeoutTime;
            return;
        }
    }

    if (prevScheduledCallback !== null) {
        isFlushingHostCallback = true;
        try {
            prevScheduledCallback(didTimeout);
        } finally {
            isFlushingHostCallback = false;
        }
    }
};

// while循环节点，设置节点和子节点的过期时间，最终返回root
function scheduleWorkToRoot(fiber, expirationTime) {
    if (fiber.expirationTime < expirationTime) {
        fiber.expirationTime = expirationTime;
    }

    var alternate = fiber.alternate;
    if (alternate !== null && alternate.expirationTime < expirationTime) {    // ?? alternate.expirationTime 什么给的
        alternate.expirationTime = expirationTime;
    }

    var node = fiber.return;
    var root = null;
    if (node === null && fiber.tag === HostRoot) {
        root = fiber.stateNode;
    } else {
        while (node !== null) {
            alternate = node.alternate;
            if (node.childExpirationTime < expirationTime) {
                node.childExpirationTime = expirationTime;
                if (alternate !== null && alternate.childExpirationTime < expirationTime) {
                    alternate.childExpirationTime = expirationTime;
                }
            } else if (alternate !== null && alternate.childExpirationTime < expirationTime) {
                alternate.childExpirationTime = expirationTime;
            }
            if (node.return === null && node.tag === HostRoot) {
                root = node.stateNode;
                break;
            }
            node = node.return;
        }
    }

    return root;

}

function unstable_shouldYield() {
    return (
        !currentDidTimeout && // 当前没有超时
        ((firstCallbackNode !== null &&   // 存在回调节点 && 首个回调节点优先级高于当前过期时间
            firstCallbackNode.expirationTime < currentExpirationTime) ||
            shouldYieldToHost())
    );
}

function shouldYieldToHost() {
    return frameDeadline <= getCurrentTime();
};


this.setState()



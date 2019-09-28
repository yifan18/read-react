let nextwork = xxx;
function workloop(){
    while(nextwork){

        let shouldUpdate = updateClassInstance(nextwork);
        let children = nextwork.render();
        reconcileChildren(nextwork.child, children)
        if(nextwork.child) {
            nextwork = nextwork.child;
            continue;
        }

        while(true){
            let next = completeWork(nextwork)  //??
            if(next){
                nextwork = next;
                break;
            }
    
            next = nextwork.sibling;
            if(next){
                nextwork = next;
                break;
            }
    
            next = nextwork.return;
            if(next){
                nextwork = next;
                continue;
            }

            break;
        }

    }
}
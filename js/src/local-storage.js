function saveItem(key, item){

    if(typeof item === 'object'){
        item = JSON.stringify(item);
    }

    localStorage.setItem(key, item);
}

function getItem(key){
    return JSON.parse(localStorage.getItem(key));
}

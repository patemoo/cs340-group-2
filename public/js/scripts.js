var reviews = {
    onWriteClick: (event) => {
        let editor = event.target.parentNode.querySelector('#review-editor');
        editor.classList.toggle('showEditor');
    },
}

var product = {
    onEditClick: (event) => {
        let editor = event.target.parentNode.querySelector('#product-editor');
        editor.classList.toggle('showEditor');
    }
}
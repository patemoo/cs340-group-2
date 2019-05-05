var reviews = {
    onWriteClick: (event) => {
        let parent = event.target.parentNode;
        let editor = parent.querySelector('#review-editor');
        let other = parent.querySelector('#product-editor');
        other.classList.remove('showEditor');
        editor.classList.toggle('showEditor');
    },
}

var product = {
    onEditClick: (event) => {
        let parent = event.target.parentNode;
        let editor = parent.querySelector('#product-editor');
        let other = parent.querySelector('#review-editor');
        other.classList.remove('showEditor');
        editor.classList.toggle('showEditor');
    }
}
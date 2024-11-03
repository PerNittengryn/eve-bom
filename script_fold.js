// Function to make lists collapsible
function makeCollapsible(parentDiv) {
    const lists = parentDiv.querySelectorAll('ul');
    lists.forEach(list => {
        const parentItem = list.parentNode;
        if (parentItem.tagName === 'LI') {
            // Make the parent item clickable
            parentItem.classList.add('collapsible', 'expanded');

            // Wrap the nested list in a div with a "content" class
            const wrapper = document.createElement('div');
            wrapper.classList.add('content');
            wrapper.appendChild(list);
            parentItem.appendChild(wrapper);

            // Toggle display and symbol on click
            parentItem.addEventListener('click', function (e) {
                e.stopPropagation();  // Prevents event bubbling
                const isExpanded = wrapper.style.display === 'block';
                wrapper.style.display = isExpanded ? 'none' : 'block';
                parentItem.classList.toggle('expanded', !isExpanded);  // Toggle symbol
            });
        }
    });
}

// Function to expand all items
function expandAll() {
    const allCollapsibleItems = document.querySelectorAll('.collapsible');
    allCollapsibleItems.forEach(item => {
        item.classList.add('expanded');
        const content = item.querySelector('.content');
        if (content) {
            content.style.display = 'block'; // Show all content
        }
    });
}

// Function to collapse all items, except for the top-level and its immediate children
function collapseAll() {
    const allCollapsibleItems = document.querySelectorAll('.collapsible');
    allCollapsibleItems.forEach((item, index) => {
        if (index > 0) { // Skip the first item (the selected one)
            item.classList.remove('expanded');
            const content = item.querySelector('.content');
            if (content) {
                content.style.display = 'none'; // Hide all content except for the first level
            }
        } else {
            // Expand the first item (the selected item) and its immediate children
            const firstContent = item.querySelector('.content');
            if (firstContent) {
                firstContent.style.display = 'block'; // Show first item's content
            }
        }
    });
}

// Event listeners for the expand/collapse buttons
document.getElementById('expand-all').addEventListener('click', expandAll);
document.getElementById('collapse-all').addEventListener('click', collapseAll);

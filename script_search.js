// Fuzzy search related functions
function updateDropdown() {
    const query = document.getElementById('productInput').value.toLowerCase();
    const dropdown = document.getElementById('dropdown');
    dropdown.innerHTML = ''; // Clear previous suggestions

    if (query.length === 0) {
        dropdown.style.display = 'none';
        return;
    }

    // Filter product types that match the query and do not end with "Blueprint" or "Reaction Formula"
    const filtered = productTypes.filter(type => 
        type.toLowerCase().includes(query) &&
        !type.endsWith('Blueprint') &&
        !type.endsWith('Reaction Formula')
    );

    if (filtered.length === 0) {
        dropdown.style.display = 'none';
        return;
    }

    // Display filtered results
    filtered.forEach(type => {
        const item = document.createElement('div');
        item.className = 'dropdown-item';
        item.textContent = type;
        item.onclick = () => {
            document.getElementById('productInput').value = type; // Set input value
            dropdown.style.display = 'none'; // Hide dropdown
            displayRecipe(); // Trigger the displayRecipe function
        };
        dropdown.appendChild(item);
    });

    dropdown.style.display = 'block'; // Show dropdown
}

// Event listener to close dropdown when clicking outside
document.addEventListener('click', (event) => {
    const searchBox = document.getElementById('productInput');
    const dropdown = document.getElementById('dropdown');
    if (!searchBox.contains(event.target) && !dropdown.contains(event.target)) {
        dropdown.style.display = 'none';
    }
});

// Assign updateDropdown function to the input for real-time searching
document.getElementById('productInput').addEventListener('input', updateDropdown);


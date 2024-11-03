let recipes = {};
let typeNames = {};
let typeIds = {};
let productTypes = []; // Array to store type names for fuzzy search

// Load the external JSON files
async function loadData() {
    try {
        const recipesResponse = await fetch('data/bp_ids.json');
        recipes = await recipesResponse.json();

        const namesResponse = await fetch('data/type_names.json');
        typeNames = await namesResponse.json();
        productTypes = Object.keys(typeNames); // Store the keys (names) for fuzzy search

        const idsResponse = await fetch('data/type_ids.json');
        typeIds = await idsResponse.json();

        console.log('Recipes loaded:', recipes); // For debugging purposes
        console.log('Type names loaded:', typeNames); // For debugging purposes
        console.log('Type IDs loaded:', typeIds); // For debugging purposes
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

// Call loadData on page load
window.onload = loadData;

// Function to display the recipe based on user input
function displayRecipe() {
    const inputValue = document.getElementById('productInput').value;
    let productId = parseInt(inputValue, 10); // Try to parse as an integer

    // If the input is not a number, check typeNames mapping
    if (isNaN(productId)) {
        productId = typeNames[inputValue]; // Convert name to type-id
    }

    const recipeListDiv = document.getElementById('recipe-list');
    recipeListDiv.innerHTML = ''; // Clear previous output

    const totalsListDiv = document.getElementById('totals-list');
    totalsListDiv.innerHTML = ''; // Clear previous totals

    // Debugging log for the resolved productId
    console.log('Resolved Product ID:', productId);

    if (recipes[productId]) {
        const ul = document.createElement('ul');

        // Add the top-level item selected by the user using the name from type_ids.json
        const topItemName = typeIds[productId] || productId; // Use the name from typeIds, or fallback to the ID
        const topLi = document.createElement('li');
        topLi.textContent = `1 x ${topItemName}`; // Show name instead of id
        ul.appendChild(topLi);

        // Create a nested list for the main product's components
        const componentsUl = document.createElement('ul');
        const totals = { blueprints: {}, components: {} }; // Object to store totals for blueprints and components
        buildRecipeList(productId, componentsUl, totals); // Pass the nested list and totals object
        topLi.appendChild(componentsUl); // Append the nested list to the top-level item

        recipeListDiv.appendChild(ul);

        // Generate and display the totals list
        generateTotalsList(totals, totalsListDiv);

        // Apply collapsible behavior to recipe and totals lists
        makeCollapsible(recipeListDiv);
        makeCollapsible(totalsListDiv);
    } else {
        recipeListDiv.innerHTML = '<p>Recipe not found!</p>';
    }
}

// Function to build the recipe list recursively
function buildRecipeList(typeId, parentElement, totals) {
    const item = recipes[typeId];
    if (!item || !item.i) return;

    // Add the blueprint name as the first item in the list with quantity 1
    const blueprintId = item.b; // Get the blueprint id from the recipe item
    const blueprintName = typeIds[blueprintId] || blueprintId; // Look up the name from type_ids.json
    const blueprintLi = document.createElement('li');
    blueprintLi.textContent = `1 x ${blueprintName}`; // Hardcoded quantity of 1
    parentElement.appendChild(blueprintLi); // Append the blueprint name

    // Add the blueprint to totals
    if (!totals.blueprints[blueprintName]) {
        totals.blueprints[blueprintName] = 0;
    }
    totals.blueprints[blueprintName] += 1; // Add 1 for the blueprint

    // Iterate through the ingredients
    item.i.forEach(([quantity, ingredientId]) => {
        const ingredientName = typeIds[ingredientId] || ingredientId; // Get the name from typeIds mapping or use id

        // Update the totals only for non-blueprint items
        if (!recipes[ingredientId]) { // Check if the ingredient is not a blueprint
            if (!totals.components[ingredientName]) {
                totals.components[ingredientName] = 0;
            }
            totals.components[ingredientName] += quantity; // Add to the total quantity for this ingredient
        }

        const li = document.createElement('li');
        li.textContent = `${quantity} x ${ingredientName}`; // Use ingredient name
        parentElement.appendChild(li);

        // If the ingredient has its own recipe, create a nested list
        if (recipes[ingredientId] && recipes[ingredientId].i.length > 0) {
            const nestedUl = document.createElement('ul');
            buildRecipeList(ingredientId, nestedUl, totals); // Recursively build the list for the ingredient
            li.appendChild(nestedUl); // Append the nested list to the current ingredient
        }
    });
}

// Function to generate the totals list
function generateTotalsList(totals, totalsListDiv) {
    totalsListDiv.innerHTML = ''; // Clear previous totals list

    // Add heading for totals
    const totalsHeading = document.createElement('div');
    totalsHeading.className = 'totals-heading';
    totalsHeading.textContent = 'Totals';
    totalsListDiv.appendChild(totalsHeading);

    // Add subheading for blueprints
    if (Object.keys(totals.blueprints).length > 0) {
        const blueprintsHeading = document.createElement('div');
        blueprintsHeading.className = 'totals-heading';
        blueprintsHeading.textContent = 'Blueprints';
        totalsListDiv.appendChild(blueprintsHeading);

        const blueprintsUl = document.createElement('ul');
        for (const [itemName, quantity] of Object.entries(totals.blueprints)) {
            const li = document.createElement('li');
            // Set quantity to 1 if it's a blueprint or reaction formula, as required
            li.textContent = `1 x ${itemName}`;
            blueprintsUl.appendChild(li);
        }
        totalsListDiv.appendChild(blueprintsUl);
    }

    // Add subheading for components
    if (Object.keys(totals.components).length > 0) {
        const componentsHeading = document.createElement('div');
        componentsHeading.className = 'totals-heading';
        componentsHeading.textContent = 'Components';
        totalsListDiv.appendChild(componentsHeading);

        const componentsUl = document.createElement('ul');
        for (const [itemName, quantity] of Object.entries(totals.components)) {
            const li = document.createElement('li');
            li.textContent = `${quantity} x ${itemName}`;
            componentsUl.appendChild(li);
        }
        totalsListDiv.appendChild(componentsUl);
    }
}

// Add an event listener to the "Show Recipe" button
document.getElementById('show-recipe').addEventListener('click', displayRecipe);

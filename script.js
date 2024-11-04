///////////////////////////////
////////// LOAD DATA //////////
///////////////////////////////

let recipes = {};
let typeNames = {};
let typeIds = {};
let productTypes = [];
let storage = {};

async function loadData() {
    try {

        // Load recipes
        const recipeResponse = await fetch('data/bp_ids.json');
        recipes = await recipeResponse.json();
        console.log('Recipes loaded:', recipes);

        // Load names
        const namesResponse = await fetch('data/type_names.json');
        typeNames = await namesResponse.json();
        productTypes = Object.keys(typeNames);
        console.log('Names loaded:', productTypes);

        // Load IDs
        const idsResponse = await fetch('data/type_ids.json');
        typeIds = await idsResponse.json();
        console.log('IDs loaded:', typeIds);
    } catch (error) {
        console.error('Error loading data:', error);
    }
}
window.onload = loadData;

//////////////////////////////////////////////
////////// RECURSIVELY BUILD RECIPE ////////// 
//////////////////////////////////////////////

function buildRecipeList(typeId, parentElement, totals, parentQuantity) {

    // Look up data
    const typeName = typeIds[typeId] || typeId;
    const originalQuantity = parentQuantity;

    // Storage
    let fromStorage = 0;
    let storageMsg = '';
    if (!storage[typeId]) {
	storage[typeId] = 0;
    }
    if (storage[typeId] > 0) {
	fromStorage = Math.min(parentQuantity, storage[typeId]);
	storage[typeId] -= fromStorage;
	parentQuantity -= fromStorage;
	storageMsg += `Taking ${fromStorage} from storage. `;
    }

    // Surplus
    const item = recipes[typeId];
    let outputQuantity = 1;
    if (item) {
	outputQuantity = item.o;
    }
    const runs = Math.ceil(parentQuantity / outputQuantity);
    const producedItems = outputQuantity * runs;
    const surplus = producedItems - parentQuantity;
    if (surplus > 0) {
	storage[typeId] += surplus;
	storageMsg += `Makes ${producedItems}. `
    }
    if (!item && runs > 0) {
	if (!totals.components[typeId]) {
	    totals.components[typeId] = 0
	}
	totals.components[typeId] += producedItems
    }

    // Write the actual item
    if (storageMsg.length > 0) {
	tmpStored = storage[typeId];
	storageMsg = ` (${storageMsg}Storage now ${tmpStored}.)`;
    }
    const li = document.createElement('li');
    li.textContent = `${originalQuantity} x ${typeName}${storageMsg}`;
    parentElement.appendChild(li);

    if (!item || !item.i) return;
    const blueprintId = item.b;
    const blueprintName = typeIds[blueprintId] || blueprintId;

    if (runs > 0) {
	const subUl = document.createElement('ul');
	const blueprintLi = document.createElement('li');
	blueprintLi.textContent = `1 x ${blueprintName}`;
	subUl.appendChild(blueprintLi);
	if (!totals.blueprints[blueprintId]) {
	    totals.blueprints.push(blueprintId);
	}
	item.i.forEach(([quantity, ingredientId]) => {
	    const totalQuantityNeeded = Math.ceil(quantity * runs);
	    buildRecipeList(ingredientId, subUl, totals, totalQuantityNeeded);
	});
	parentElement.appendChild(subUl);
    }
}

////////////////////////////////////
////////// DISPLAY RECIPE ////////// 
////////////////////////////////////

function makeTotals(totals, totalsListDiv) {
    const totalsHeading = document.createElement('h2');
    totalsHeading.textContent = 'Totals';
    totalsListDiv.appendChild(totalsHeading);

    const bpHeading = document.createElement('h3');
    bpHeading.textContent = 'Blueprints';
    totalsListDiv.appendChild(bpHeading);

    const bpUl = document.createElement('ul');
    totals.blueprints.forEach((bpId) => {
	const li = document.createElement('li');
	const bpName = typeIds[bpId];
        li.textContent = `${bpName}`;
	bpUl.appendChild(li)
    });
    totalsListDiv.appendChild(bpUl);

    const compHeading = document.createElement('h3');
    compHeading.textContent = 'Raw materials';
    totalsListDiv.appendChild(compHeading);

    const compUl = document.createElement('ul');
    for (const [compId, quantity] of Object.entries(totals.components)) {
	const li = document.createElement('li');
	const compName = typeIds[compId];
        li.textContent = `${quantity} x ${compName}`;
	compUl.appendChild(li)
    }
    totalsListDiv.appendChild(compUl);
}

function displayRecipe() {

    // Collect input and look up typeID
    storage = {};  // Important to reset between queries
    const countValue = document.getElementById('quantityInput').value;
    const inputValue = document.getElementById('productInput').value;
    let productId = typeNames[inputValue];
    console.log('Found productId:', productId)

    // Clear results space
    const hierarchyListDiv = document.getElementById('hierarchy-list');
    hierarchyListDiv.innerHTML = '';
    const totalsListDiv = document.getElementById('totals-list');
    totalsListDiv.innerHTML = '';

    // Build the recipe
    if (recipes[productId]) {

	const hierHeading = document.createElement('h2');
	hierHeading.textContent = 'Hierarchy';
	hierarchyListDiv.appendChild(hierHeading);

	const ul = document.createElement('ul');
        const totals = { blueprints: [], components: {} };
	buildRecipeList(productId, ul, totals, countValue);
	hierarchyListDiv.appendChild(ul)
	makeTotals(totals, totalsListDiv);
    } else {
	hierarchyListDiv.innerHTML = '<p>Recipe not found!</p>';
    }
}

//////////////////////////////////
////////// FUZZY SEARCH //////////
//////////////////////////////////

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

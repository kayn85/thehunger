// Setup för API och localStorage
const setUp = {
  apiKey: "2a8525c1abb04e178cbd15e70efae71e",
  recipeWebsite: "https://api.spoonacular.com/recipes",
  savedStorage: "myCookbook"
};

// API-tjänst för att hämta recept
const recipeDataFetcher = {

  async getDataFromWeb(webAddress) {
    try {
      const response = await fetch(webAddress);

      if (!response.ok) {
        throw new Error("Couldn't get recipe information");
      }

      return await response.json();
    } catch (error) {
      recipeTools.showMessage(error.message, 'error');
      return null;
    }
  },

  // Hämta recept baserat på ingredienser
  findRecipesByIngredients: (ingredients) =>
    recipeDataFetcher.getDataFromWeb(`${setUp.recipeWebsite}/findByIngredients?ingredients=${ingredients}&number=10&apiKey=${setUp.apiKey}`),

  // Hämta detaljerad information om ett specifikt recept och visa den på instruction funktionenen 
  getRecipeDetails: (recipeId) =>
    recipeDataFetcher.getDataFromWeb(`${setUp.recipeWebsite}/${recipeId}/information?apiKey=${setUp.apiKey}`)
};

// funktioner för localStorage och notifikationer
const recipeTools = {
  getSavedRecipes: (storageKey, defaultRecipes = []) => {
    try {
      const savedRecipes = JSON.parse(localStorage.getItem(storageKey)) || defaultRecipes;
      return savedRecipes;
    } catch (error) {
      console.error("Oops! Couldn't read saved recipes:", error);
      return defaultRecipes;
    }
  },

  // Spara data till localStorage med felhantering
  saveRecipes: (storageKey, recipes) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(recipes));
    } catch (error) {
      console.error("Couldn't save recipes:", error);
    }
  },

  // Styling för notifikationen och popup
  showMessage: (message, type = 'success') => {
    const messageBox = document.createElement('div');
    messageBox.textContent = message;

    messageBox.style.position = 'fixed';
    messageBox.style.bottom = '20px';
    messageBox.style.right = '20px';
    messageBox.style.padding = '15px';
    messageBox.style.borderRadius = '5px';
    messageBox.style.color = 'white';
    messageBox.style.zIndex = '1000';

    messageBox.style.backgroundColor = type === 'success' ? 'green' : 'red';

    document.body.appendChild(messageBox);

    setTimeout(() => messageBox.remove(), 3000);
  }
};

// Kontroller olika funktioner i appen
const recipeAppManager = {

  globalRecipeStatsChart: null,

  // Skapa popup-div för recept instruktioner
  createRecipeDetailsPopup() {
    return document.getElementById("recipe-popup") ||
      Object.assign(document.body.appendChild(document.createElement("div")), {
        id: "recipe-popup",
        style: "display: none;"
      });
  },

  // Stäng popup
  closeRecipePopup() {
    document.getElementById("recipe-popup").style.display = "none";
  },

  // Skapa receptkort för sökresultat
  createRecipeCard({ title, image, id, usedIngredientCount }) {
    const savedRecipes = recipeTools.getSavedRecipes(setUp.savedStorage);
    const isSavedRecipe = savedRecipes.some(savedRecipe => savedRecipe.id === id);

    const saveButtonText = isSavedRecipe ? "Saved" : "Save Recipe";
    const saveButtonDisabled = isSavedRecipe ? "disabled" : "";

    return `
      <div class="recipe-card">
        <h3>${title}</h3>
        <img src="${image}" alt="${title}" style="width:100%; max-height:200px; object-fit:cover;">
        <p>Ingredients used: ${usedIngredientCount}</p>
        <div class="recipe-card-buttons">
          <button ${saveButtonDisabled} 
            onclick="recipeAppManager.saveRecipeToCookbook({ 
              title: '${title}', 
              image: '${image}', 
              usedIngredientCount: ${usedIngredientCount}, 
              id: ${id} 
            })">${saveButtonText}</button>
          <button onclick="recipeAppManager.showInstructions(${id}, true)">Instructions</button>
        </div>
      </div>`;
  },

  // Visa recept i en container
  showRecipes(container, recipes) {
    container.innerHTML = recipes.map(recipeAppManager.createRecipeCard).join('');
  },

  // Spara recept till cookbook
  saveRecipeToCookbook(recipe) {
    const cookbook = recipeTools.getSavedRecipes(setUp.savedStorage);

    // Kontrollera om receptet redan finns
    if (cookbook.some(r => r.title === recipe.title)) {
      recipeTools.showMessage(`${recipe.title} is already in the cookbook!`, 'error');
      return;
    }

    // Lägg till recept i cookbook och sparar den på localStorage
    cookbook.push({
      title: recipe.title,
      image: recipe.image,
      description: `Used ingredients: ${recipe.usedIngredientCount}`,
      id: recipe.id
    });

    recipeTools.saveRecipes(setUp.savedStorage, cookbook);
    recipeTools.showMessage(`${recipe.title} has been saved to your cookbook!`);
  },

  // Ta bort recept från cookbook
  removeFromCookbook(index) {
    const cookbook = recipeTools.getSavedRecipes(setUp.savedStorage);
    cookbook.splice(index, 1);
    recipeTools.saveRecipes(setUp.savedStorage, cookbook);
    recipeAppManager.runCookbook();
  },

  // Visa receptinstruktioner
  async showInstructions(id, isFromSearch = false) {
    const popup = recipeAppManager.createRecipeDetailsPopup();
    const recipe = await recipeDataFetcher.getRecipeDetails(id);

    if (recipe) {
      popup.innerHTML = `
        <div class="popup-content">
          <h3>${recipe.title}</h3>
          <p>${recipe.instructions || "No instructions available."}</p>
          <button onclick="recipeAppManager.closeRecipePopup()">Close</button>
        </div>`;
      popup.style.display = "block";
    }
  },

  // kör sökningssidan
  runSearchPage() {
    const form = document.getElementById("ingredient-form");
    const resultDiv = document.getElementById("recipe-result");

    // Visa tidigare sökresultat
    const previousResults = recipeTools.getSavedRecipes("search-results");
    if (previousResults.length) {
      recipeAppManager.showRecipes(resultDiv, previousResults);
    }

    // lyssnar på submit från formen.
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const recipes = await recipeDataFetcher.findRecipesByIngredients(
        document.getElementById("ingredients").value
      );
      recipeTools.saveRecipes("search-results", recipes);
      recipeAppManager.showRecipes(resultDiv, recipes);
    });
  },

  // Kör cookbooksidan
  runCookbook() {
    const cookbookDiv = document.getElementById("cookbook-recipes");
    if (cookbookDiv) {
      recipeAppManager.showCookbook(
        cookbookDiv,
        recipeTools.getSavedRecipes(setUp.savedStorage)
      );
    }
  },

  // Visa recept i cookbook när man trycker på "save" från recipe result
  showCookbook(container, cookbook) {
    container.innerHTML = cookbook.length
      ? cookbook.map((recipe, i) => `
        <div class="recipe-card">
          <h3>${recipe.title}</h3>
          <img src="${recipe.image}" alt="${recipe.title}" style="width:100%; max-height:200px; object-fit:cover;">
          <p>${recipe.description}</p>
          <div class="recipe-card-buttons">
            <button onclick="recipeAppManager.removeFromCookbook(${i})">Remove</button>
            <button onclick="recipeAppManager.showInstructions(${recipe.id})">Instructions</button>
          </div>
        </div>`).join('')
      : "<p>No saved recipes yet!</p>";
  },

  // Kör statistiksidan
  runStatsPage() {
    const chartCanvas = document.getElementById("stats-chart");
    const statsMessage = document.getElementById("stats-message");

    // ser till att chart är null
    if (!recipeAppManager.globalRecipeStatsChart) {
      recipeAppManager.globalRecipeStatsChart = null;
    }

    const cookbook = recipeTools.getSavedRecipes(setUp.savedStorage);

    // Kollar om man har lagt till cookbook. Inga statistik om det är 0.
    if (cookbook.length === 0) {
      statsMessage.textContent = "No recipes saved yet! Add recipes to your cookbook to see statistics.";

      if (recipeAppManager.globalRecipeStatsChart) {
        recipeAppManager.globalRecipeStatsChart.destroy();
        recipeAppManager.globalRecipeStatsChart = null;
      }
      return;
    }

    // räknar ut ingrediensstatistik
    const ingredientStats = cookbook.reduce((stats, recipe) => {
      const match = recipe.description.match(/Used ingredients: (\d+)/);
      stats[recipe.title] = match ? parseInt(match[1]) : 0;
      return stats;
    }, {});

    // Färgschema för chart. Har anpassat den från sidan theme (css)
    const baseColors = [
      '#FFB703', '#FB8500', '#2E2E2E', 'FFF6E5', 'rgba(245, 87, 0, 0.7)'
    ];

    // ta bort gamla chart
    if (recipeAppManager.globalRecipeStatsChart) {
      recipeAppManager.globalRecipeStatsChart.destroy();
    }

    // Skapa eller uppdatera chart
    recipeAppManager.globalRecipeStatsChart = new Chart(chartCanvas, {
      type: "bar",
      data: {
        labels: Object.keys(ingredientStats),
        datasets: [{
          label: "Ingredients Used per Recipe",
          data: Object.values(ingredientStats),
          backgroundColor: Object.keys(ingredientStats).map((_, index) =>
            baseColors[index % baseColors.length]
          )
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: false
          },
          legend: {
            labels: {
              color: 'white'
            }
          }
        },
        scales: {
          x: {
            ticks: {
              display: false,
              color: 'white'
            },
            grid: { display: false }
          },
          y: {
            beginAtZero: true,
            title: { display: false, text: "Number of Ingredients" },
            ticks: {
              color: 'white'
            },
            grid: {
              color: 'rgba(255,255,255,0.2)'
            }
          }
        }
      }
    });
  }
};

// Kollar vilka sidan man är på och kör funktioner som anpassa för den sidan
function runPage() {
  const currentPage = document.body.id;

  switch (currentPage) {
    case "start-page":
      recipeAppManager.runSearchPage();
      break;
    case "cookbook-page":
      recipeAppManager.runCookbook();
      break;
    case "stats-page":
      recipeAppManager.runStatsPage();
      break;
  }
}

// När document laddat klart så kan den köras. För att kollar vilken sidan man är på
runPage();
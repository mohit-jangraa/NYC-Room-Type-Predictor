// ============================================================
// CONFIG
// ============================================================
// Point this at wherever your FastAPI app (main.py) is running.
const API_BASE = "https://nyc-room-type-predictor-x8q9.onrender.com";


// Room type classes in the exact order scikit-learn sorts string
// labels (alphabetical) -> this matches the order of the
// probability array returned by predict_proba().
const CLASS_ORDER = ["Entire home/apt", "Private room", "Shared room"];

const NEIGHBOURHOODS = {
  "Manhattan": ["Harlem", "Upper West Side", "Hell's Kitchen", "East Village", "Midtown", "Chelsea", "Greenwich Village", "Chinatown", "Financial District", "Upper East Side", "SoHo", "Washington Heights"],
  "Brooklyn": ["Williamsburg", "Bedford-Stuyvesant", "Bushwick", "Crown Heights", "Park Slope", "Greenpoint", "Bay Ridge", "Flatbush", "Fort Greene", "Sunset Park"],
  "Queens": ["Astoria", "Long Island City", "Flushing", "Ridgewood", "Sunnyside", "Jamaica", "Woodside", "Elmhurst"],
  "Bronx": ["Fordham", "Mott Haven", "Kingsbridge", "Riverdale", "Concourse", "Wakefield"],
  "Staten Island": ["St. George", "Tompkinsville", "Stapleton", "Great Kills", "New Brighton"]
};

// Approximate borough centroids, used to nudge lat/long defaults
// when a borough is picked (purely a UX convenience).
const BOROUGH_CENTROIDS = {
  "Manhattan": [40.7831, -73.9712],
  "Brooklyn": [40.6782, -73.9442],
  "Queens": [40.7282, -73.7949],
  "Bronx": [40.8448, -73.8648],
  "Staten Island": [40.5795, -74.1502]
};

// ============================================================
// ELEMENT REFS
// ============================================================
const form = document.getElementById("predictForm");
const boroughTabs = document.getElementById("boroughTabs");
const boroughInput = document.getElementById("neighbourhood_group");
const neighbourhoodSelect = document.getElementById("neighbourhood");
const latInput = document.getElementById("latitude");
const lonInput = document.getElementById("longitude");
const availabilityInput = document.getElementById("availability_365");
const availabilityValue = document.getElementById("availabilityValue");
const runBtn = document.getElementById("runBtn");
const formError = document.getElementById("formError");

const stageIdle = document.getElementById("stageIdle");
const stageLoading = document.getElementById("stageLoading");
const stageResult = document.getElementById("stageResult");
const stageError = document.getElementById("stageError");
const errorMessage = document.getElementById("errorMessage");

const resultLabel = document.getElementById("resultLabel");
const probScale = document.getElementById("probScale");

const statusDot = document.getElementById("statusDot");
const apiStatus = document.getElementById("apiStatus");
const coordReadout = document.getElementById("coordReadout");

const floorplans = {
  "Entire home/apt": document.getElementById("fpEntire"),
  "Private room": document.getElementById("fpPrivate"),
  "Shared room": document.getElementById("fpShared")
};

// ============================================================
// BOROUGH TABS
// ============================================================
boroughTabs.addEventListener("click", (e) => {
  const btn = e.target.closest(".borough-tab");
  if (!btn) return;

  [...boroughTabs.children].forEach(t => t.classList.remove("is-active"));
  btn.classList.add("is-active");

  const borough = btn.dataset.borough;
  boroughInput.value = borough;

  populateNeighbourhoods(borough);

  const centroid = BOROUGH_CENTROIDS[borough];
  if (centroid) {
    latInput.value = centroid[0];
    lonInput.value = centroid[1];
    updateCoordReadout();
  }
});

function populateNeighbourhoods(borough) {
  const list = NEIGHBOURHOODS[borough] || [];
  neighbourhoodSelect.innerHTML = "";
  list.forEach((n, i) => {
    const opt = document.createElement("option");
    opt.value = n;
    opt.textContent = n;
    if (i === 0) opt.selected = true;
    neighbourhoodSelect.appendChild(opt);
  });
}

// default to Manhattan on load
document.querySelector('[data-borough="Manhattan"]').click();

// ============================================================
// COORDINATE READOUT + AVAILABILITY SLIDER
// ============================================================
function updateCoordReadout() {
  const lat = parseFloat(latInput.value).toFixed(4);
  const lon = parseFloat(lonInput.value).toFixed(4);
  coordReadout.textContent = `LAT ${lat}\u00B0 N  /  LON ${Math.abs(lon)}\u00B0 W`;
}
latInput.addEventListener("input", updateCoordReadout);
lonInput.addEventListener("input", updateCoordReadout);

function updateAvailabilityUI() {
  const val = availabilityInput.value;
  availabilityValue.textContent = `${val} / 365 days`;
  availabilityInput.style.setProperty("--fill", `${(val / 365) * 100}%`);
}
availabilityInput.addEventListener("input", updateAvailabilityUI);
updateAvailabilityUI();

// ============================================================
// API STATUS CHECK
// ============================================================
async function checkApiStatus() {
  try {
    const res = await fetch(`${API_BASE}/`, { method: "GET" });
    if (res.ok) {
      statusDot.classList.remove("is-offline");
      statusDot.classList.add("is-online");
      apiStatus.innerHTML = '<span class="status-dot is-online"></span> API online';
    } else {
      throw new Error("bad status");
    }
  } catch (err) {
    statusDot.classList.add("is-offline");
    apiStatus.innerHTML = '<span class="status-dot is-offline"></span> API unreachable';
  }
}
checkApiStatus();

// ============================================================
// FORM SUBMIT -> PREDICT
// ============================================================
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  formError.textContent = "";

  if (!boroughInput.value) {
    formError.textContent = "Pick a borough before running the prediction.";
    return;
  }
  if (!neighbourhoodSelect.value) {
    formError.textContent = "Pick a neighbourhood before running the prediction.";
    return;
  }

  const payload = {
    latitude: parseFloat(latInput.value),
    longitude: parseFloat(lonInput.value),
    price: parseFloat(document.getElementById("price").value),
    minimum_nights: parseInt(document.getElementById("minimum_nights").value, 10),
    number_of_reviews: parseInt(document.getElementById("number_of_reviews").value, 10),
    reviews_per_month: parseFloat(document.getElementById("reviews_per_month").value),
    calculated_host_listings_count: parseInt(document.getElementById("calculated_host_listings_count").value, 10),
    availability_365: parseInt(availabilityInput.value, 10),
    neighbourhood_group: boroughInput.value,
    neighbourhood: neighbourhoodSelect.value
  };

  setLoadingState(true);

  try {
    const res = await fetch(`${API_BASE}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const detail = await safeReadError(res);
      throw new Error(detail || `Request failed (HTTP ${res.status})`);
    }

    const data = await res.json();
    renderResult(data);

  } catch (err) {
    showError(err.message || "Could not reach the model API.");
  } finally {
    setLoadingState(false);
  }
});

async function safeReadError(res) {
  try {
    const body = await res.json();
    if (body && body.detail) {
      return typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail);
    }
  } catch (_) { /* not json */ }
  return null;
}

// ============================================================
// STATE RENDERING
// ============================================================
function setLoadingState(isLoading) {
  runBtn.disabled = isLoading;
  runBtn.classList.toggle("is-loading", isLoading);
  runBtn.querySelector(".run-btn__label").textContent = isLoading ? "Tracing\u2026" : "Run Prediction";

  if (isLoading) {
    show(stageLoading);
    hide(stageIdle, stageResult, stageError);
  }
}

function showError(message) {
  errorMessage.textContent = message;
  show(stageError);
  hide(stageIdle, stageLoading, stageResult);
}

function renderResult(data) {
  const predicted = data.Predicted_room_type;
  const probabilities = data.Probability || [];

  // reset + draw the matching floor plan
  Object.values(floorplans).forEach(svg => {
    svg.hidden = true;
    svg.querySelectorAll(".fp-draw").forEach(el => {
      // restart the stroke-draw animation
      el.style.animation = "none";
      void el.offsetWidth;
      el.style.animation = "";
    });
  });

  const activePlan = floorplans[predicted];
  if (activePlan) activePlan.hidden = false;

  resultLabel.textContent = predicted || "\u2014";

  // build probability rows
  probScale.innerHTML = "";
  const rows = CLASS_ORDER.map((label, i) => ({
    label,
    value: probabilities[i] !== undefined ? probabilities[i] : 0
  }));

  const topValue = Math.max(...rows.map(r => r.value));

  rows.forEach(row => {
    const rowEl = document.createElement("div");
    rowEl.className = "prob-row" + (row.value === topValue ? " is-top" : "");
    rowEl.innerHTML = `
      <span class="prob-row__label">${row.label}</span>
      <span class="prob-row__track"><span class="prob-row__fill"></span></span>
      <span class="prob-row__pct">${(row.value * 100).toFixed(1)}%</span>
    `;
    probScale.appendChild(rowEl);
    // animate width in on next frame
    requestAnimationFrame(() => {
      rowEl.querySelector(".prob-row__fill").style.width = `${row.value * 100}%`;
    });
  });

  show(stageResult);
  hide(stageIdle, stageLoading, stageError);
}

function show(...els) { els.forEach(el => (el.hidden = false)); }
function hide(...els) { els.forEach(el => (el.hidden = true)); }

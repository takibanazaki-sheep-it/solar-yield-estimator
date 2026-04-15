const state = {
  map: null,
  marker: null,
  hourlyChart: null,
  dailyChart: null,
  roofCounter: 0,
};

const el = {
  placeInput: document.getElementById("placeInput"),
  daysInput: document.getElementById("daysInput"),
  lossInput: document.getElementById("lossInput"),
  tempCoeffInput: document.getElementById("tempCoeffInput"),
  noctInput: document.getElementById("noctInput"),
  estimateBtn: document.getElementById("estimateBtn"),
  useDublinBtn: document.getElementById("useDublinBtn"),
  searchPlaceBtn: document.getElementById("searchPlaceBtn"),
  addRoofBtn: document.getElementById("addRoofBtn"),
  loadEastWestBtn: document.getElementById("loadEastWestBtn"),
  roofFaces: document.getElementById("roofFaces"),
  roofFaceTemplate: document.getElementById("roofFaceTemplate"),
  locationText: document.getElementById("locationText"),
  markerCoords: document.getElementById("markerCoords"),
  systemSizeStat: document.getElementById("systemSizeStat"),
  bestDayStat: document.getElementById("bestDayStat"),
  totalStat: document.getElementById("totalStat"),
  peakHourStat: document.getElementById("peakHourStat"),
  roofTotalsBody: document.getElementById("roofTotalsBody"),
  dailyTableBody: document.getElementById("dailyTableBody"),
};

function getMarkerLatLon() {
  if (!state.marker) return null;
  const pos = state.marker.getLatLng();
  return { lat: Number(pos.lat), lon: Number(pos.lng) };
}

function updateLocationLabel(lat, lon, label = null) {
  el.locationText.textContent = label
    ? `${label} · ${Number(lat).toFixed(5)}, ${Number(lon).toFixed(5)}`
    : `${Number(lat).toFixed(5)}, ${Number(lon).toFixed(5)}`;
}

function updateMarkerReadout(lat, lon) {
  el.markerCoords.innerHTML = `<strong>Using marker position:</strong> ${Number(lat).toFixed(6)}, ${Number(lon).toFixed(6)}`;
}

function ensureMarker(lat, lon) {
  if (state.marker) {
    state.marker.setLatLng([lat, lon]);
    updateMarkerReadout(lat, lon);
    return;
  }

  state.marker = L.marker([lat, lon], { draggable: true }).addTo(state.map);
  updateMarkerReadout(lat, lon);

  state.marker.on("drag", (event) => {
    const pos = event.target.getLatLng();
    updateLocationLabel(pos.lat, pos.lng, "Marker moving");
    updateMarkerReadout(pos.lat, pos.lng);
  });

  state.marker.on("dragend", (event) => {
    const pos = event.target.getLatLng();
    updateLocationLabel(pos.lat, pos.lng, "Marker moved");
    updateMarkerReadout(pos.lat, pos.lng);
  });
}

function setLocation(lat, lon, label = null, recenter = true) {
  ensureMarker(lat, lon);

  if (recenter) {
    state.map.setView([lat, lon], Math.max(state.map.getZoom(), 9));
  }

  updateLocationLabel(lat, lon, label);
}

function initMap() {
  state.map = L.map("map").setView([53.3498, -6.2603], 7);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(state.map);

  state.map.on("click", (event) => {
    const { lat, lng } = event.latlng;
    setLocation(lat, lng, "Map selection");
  });

  setLocation(53.3498, -6.2603, "Dublin, Ireland");
}

async function searchPlace() {
  const query = el.placeInput.value.trim();
  if (!query) {
    alert("Enter a place name first.");
    return;
  }

  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", query);
  url.searchParams.set("count", "5");
  url.searchParams.set("language", "en");
  url.searchParams.set("format", "json");

  const response = await fetch(url);
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Place search failed: ${response.status} ${text}`);
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("Place search response was not valid JSON.");
  }

  if (!data.results || !data.results.length) {
    alert("No matching place found.");
    return;
  }

  const best = data.results[0];
  const labelParts = [best.name, best.admin1, best.country].filter(Boolean);
  setLocation(best.latitude, best.longitude, labelParts.join(", "));
}

function addRoofFace(values = {}) {
  state.roofCounter += 1;

  const node = el.roofFaceTemplate.content.firstElementChild.cloneNode(true);
  node.dataset.roofId = String(state.roofCounter);

  const nameInput = node.querySelector(".roof-name");
  const countInput = node.querySelector(".roof-panel-count");
  const wattInput = node.querySelector(".roof-panel-watt");
  const tiltInput = node.querySelector(".roof-tilt");
  const azimuthInput = node.querySelector(".roof-azimuth");
  const lossInput = node.querySelector(".roof-loss");
  const title = node.querySelector(".roof-title");

  nameInput.value = values.name ?? `Roof face ${state.roofCounter}`;
  countInput.value = values.panelCount ?? 10;
  wattInput.value = values.panelWatt ?? 425;
  tiltInput.value = values.tilt ?? 35;
  azimuthInput.value = values.azimuth ?? 0;
  lossInput.value = values.lossOverride ?? "";

  title.textContent = nameInput.value;
  nameInput.addEventListener("input", () => {
    title.textContent = nameInput.value || "Roof face";
  });

  node.querySelector(".remove-roof-btn").addEventListener("click", () => {
    node.remove();
  });

  el.roofFaces.appendChild(node);
}

function loadEastWestExample() {
  el.roofFaces.innerHTML = "";
  addRoofFace({
    name: "East roof",
    panelCount: 10,
    panelWatt: 425,
    tilt: 35,
    azimuth: -90,
  });
  addRoofFace({
    name: "West roof",
    panelCount: 10,
    panelWatt: 425,
    tilt: 35,
    azimuth: 90,
  });
}

function getInputs() {
  const markerPos = getMarkerLatLon();

  const roofs = [...el.roofFaces.querySelectorAll(".roof-card")].map((card) => ({
    name: card.querySelector(".roof-name").value.trim() || "Roof face",
    panelCount: Number(card.querySelector(".roof-panel-count").value),
    panelWatt: Number(card.querySelector(".roof-panel-watt").value),
    tilt: Number(card.querySelector(".roof-tilt").value),
    azimuth: Number(card.querySelector(".roof-azimuth").value),
    lossOverride:
      card.querySelector(".roof-loss").value === ""
        ? null
        : Number(card.querySelector(".roof-loss").value),
  }));

  return {
    latitude: markerPos ? markerPos.lat : NaN,
    longitude: markerPos ? markerPos.lon : NaN,
    days: Number(el.daysInput.value),
    systemLossPercent: Number(el.lossInput.value),
    tempCoeffPercentPerC: Number(el.tempCoeffInput.value),
    noct: Number(el.noctInput.value),
    roofs,
  };
}

function validateInputs(inputs) {
  if (!Number.isFinite(inputs.latitude) || !Number.isFinite(inputs.longitude)) {
    throw new Error("A valid marker position is required.");
  }

  if (inputs.days < 1 || inputs.days > 16) {
    throw new Error("Forecast days must be between 1 and 16.");
  }

  if (!inputs.roofs.length) {
    throw new Error("Add at least one roof face.");
  }

  for (const roof of inputs.roofs) {
    if (roof.panelCount <= 0 || roof.panelWatt <= 0) {
      throw new Error(`Invalid panel count or wattage on ${roof.name}.`);
    }
    if (roof.tilt < 0 || roof.tilt > 90) {
      throw new Error(`Tilt must be between 0 and 90 on ${roof.name}.`);
    }
    if (roof.azimuth < -180 || roof.azimuth > 180) {
      throw new Error(`Azimuth must be between -180 and 180 on ${roof.name}.`);
    }
    if (roof.lossOverride !== null && (roof.lossOverride < 0 || roof.lossOverride > 50)) {
      throw new Error(`Loss override must be between 0 and 50 on ${roof.name}.`);
    }
  }
}

async function fetchForecastForRoof(inputs, roof) {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(inputs.latitude));
  url.searchParams.set("longitude", String(inputs.longitude));
  url.searchParams.set(
    "hourly",
    [
      "global_tilted_irradiance",
      "global_tilted_irradiance_instant",
      "temperature_2m",
      "cloud_cover"
    ].join(",")
  );
  url.searchParams.set("forecast_days", String(inputs.days));
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("tilt", String(roof.tilt));
  url.searchParams.set("azimuth", String(roof.azimuth));

  const response = await fetch(url);
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Forecast request failed for ${roof.name}: ${response.status} ${text}`);
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Forecast response for ${roof.name} was not valid JSON.`);
  }

  if (!data.hourly || !data.hourly.time) {
    throw new Error(`Forecast data for ${roof.name} is missing hourly timestamps.`);
  }

  if (
    !data.hourly.global_tilted_irradiance &&
    !data.hourly.global_tilted_irradiance_instant
  ) {
    throw new Error(`Forecast data for ${roof.name} is missing tilted irradiance.`);
  }

  return data;
}

function deriveRoofHourlyYield(inputs, roof, forecast) {
  const capacityKw = (roof.panelCount * roof.panelWatt) / 1000;
  const effectiveLoss = roof.lossOverride ?? inputs.systemLossPercent;
  const basePerformanceRatio = Math.max(0, 1 - effectiveLoss / 100);

  return forecast.hourly.time.map((time, idx) => {
    const gti = Number(
      forecast.hourly.global_tilted_irradiance?.[idx] ??
      forecast.hourly.global_tilted_irradiance_instant?.[idx] ??
      0
    );
    const tempAir = Number(forecast.hourly.temperature_2m?.[idx] ?? 15);
    const cloudCover = Number(forecast.hourly.cloud_cover?.[idx] ?? 0);

    const cellTemp = tempAir + (gti / 800) * (inputs.noct - 20);
    const tempFactor = Math.max(
      0,
      1 + (inputs.tempCoeffPercentPerC / 100) * (cellTemp - 25)
    );

    const rawKw = capacityKw * (gti / 1000) * basePerformanceRatio * tempFactor;
    const cappedKw = Math.min(capacityKw, Math.max(0, rawKw));

    return {
      roofName: roof.name,
      time,
      gti,
      tempAir,
      cloudCover,
      yieldKwh: cappedKw,
      capacityKw,
    };
  });
}

function combineHourly(roofSeriesList) {
  const combinedMap = new Map();

  for (const series of roofSeriesList) {
    for (const row of series) {
      if (!combinedMap.has(row.time)) {
        combinedMap.set(row.time, {
          time: row.time,
          yieldKwh: 0,
          gtiWeighted: 0,
          tempAir: row.tempAir,
          cloudCover: row.cloudCover,
          capacityKw: 0,
        });
      }

      const target = combinedMap.get(row.time);
      target.yieldKwh += row.yieldKwh;
      target.gtiWeighted += row.gti * row.capacityKw;
      target.capacityKw += row.capacityKw;
      target.tempAir = row.tempAir;
      target.cloudCover = row.cloudCover;
    }
  }

  return [...combinedMap.values()].map((row) => ({
    ...row,
    gti: row.capacityKw ? row.gtiWeighted / row.capacityKw : 0,
  }));
}

function aggregateDaily(hourlyRows) {
  const map = new Map();

  for (const row of hourlyRows) {
    const day = row.time.slice(0, 10);

    if (!map.has(day)) {
      map.set(day, {
        date: day,
        yieldKwh: 0,
        peakHour: 0,
        cloudCoverSum: 0,
        hours: 0,
      });
    }

    const item = map.get(day);
    item.yieldKwh += row.yieldKwh;
    item.peakHour = Math.max(item.peakHour, row.yieldKwh);
    item.cloudCoverSum += row.cloudCover;
    item.hours += 1;
  }

  return [...map.values()].map((item) => ({
    ...item,
    cloudCoverAvg: item.hours ? item.cloudCoverSum / item.hours : 0,
  }));
}

function formatNumber(value, digits = 2) {
  return Number(value).toFixed(digits);
}

function updateStats(inputs, hourlyRows, dailyRows) {
  const totalCapacity = inputs.roofs.reduce(
    (sum, roof) => sum + (roof.panelCount * roof.panelWatt) / 1000,
    0
  );
  const total = dailyRows.reduce((sum, row) => sum + row.yieldKwh, 0);
  const bestDay = dailyRows.reduce(
    (best, row) => (row.yieldKwh > (best?.yieldKwh ?? -1) ? row : best),
    null
  );
  const peakHour = hourlyRows.reduce(
    (best, row) => (row.yieldKwh > (best?.yieldKwh ?? -1) ? row : best),
    null
  );

  el.systemSizeStat.textContent = `${formatNumber(totalCapacity, 2)} kWp`;
  el.totalStat.textContent = `${formatNumber(total)} kWh`;
  el.bestDayStat.textContent = bestDay
    ? `${bestDay.date} · ${formatNumber(bestDay.yieldKwh)} kWh`
    : "—";
  el.peakHourStat.textContent = peakHour
    ? `${peakHour.time.replace("T", " ")} · ${formatNumber(peakHour.yieldKwh)} kWh`
    : "—";
}

function buildRoofTotals(inputs, roofSeriesList) {
  const rows = inputs.roofs
    .map((roof, idx) => {
      const total = roofSeriesList[idx].reduce((sum, row) => sum + row.yieldKwh, 0);
      const size = (roof.panelCount * roof.panelWatt) / 1000;
      const orientation = `${roof.tilt}° / ${roof.azimuth}°`;

      return `
        <tr>
          <td>${roof.name}</td>
          <td>${orientation}</td>
          <td>${formatNumber(size)}</td>
          <td>${formatNumber(total)}</td>
        </tr>
      `;
    })
    .join("");

  el.roofTotalsBody.innerHTML =
    rows || '<tr><td colspan="4">No roof data available.</td></tr>';
}

function buildDailyTable(dailyRows) {
  if (!dailyRows.length) {
    el.dailyTableBody.innerHTML =
      '<tr><td colspan="4">No daily data available.</td></tr>';
    return;
  }

  el.dailyTableBody.innerHTML = dailyRows
    .map(
      (row) => `
      <tr>
        <td>${row.date}</td>
        <td>${formatNumber(row.yieldKwh)}</td>
        <td>${formatNumber(row.peakHour)}</td>
        <td>${formatNumber(row.cloudCoverAvg, 1)}</td>
      </tr>
    `
    )
    .join("");
}

function renderCharts(hourlyRows, dailyRows, roofSeriesList, roofs) {
  const hourlyCtx = document.getElementById("hourlyChart");
  const dailyCtx = document.getElementById("dailyChart");

  if (state.hourlyChart) state.hourlyChart.destroy();
  if (state.dailyChart) state.dailyChart.destroy();

  const roofDatasets = roofSeriesList.map((series, idx) => ({
    label: roofs[idx].name,
    data: series.map((row) => row.yieldKwh),
    tension: 0.25,
    borderWidth: 2,
    pointRadius: 0,
  }));

  state.hourlyChart = new Chart(hourlyCtx, {
    type: "line",
    data: {
      labels: hourlyRows.map((row) => row.time.replace("T", " ")),
      datasets: [
        {
          label: "Total yield (kWh)",
          data: hourlyRows.map((row) => row.yieldKwh),
          tension: 0.25,
          borderWidth: 3,
          pointRadius: 0,
        },
        ...roofDatasets,
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { labels: { color: "#eef2f8" } },
      },
      scales: {
        x: { ticks: { color: "#aab4c3", maxTicksLimit: 14 } },
        y: {
          ticks: { color: "#aab4c3" },
          title: { display: true, text: "kWh", color: "#aab4c3" },
        },
      },
    },
  });

  state.dailyChart = new Chart(dailyCtx, {
    type: "bar",
    data: {
      labels: dailyRows.map((row) => row.date),
      datasets: [
        {
          label: "Estimated daily yield (kWh)",
          data: dailyRows.map((row) => row.yieldKwh),
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { labels: { color: "#eef2f8" } },
      },
      scales: {
        x: { ticks: { color: "#aab4c3" } },
        y: { ticks: { color: "#aab4c3" } },
      },
    },
  });
}

async function runEstimate() {
  try {
    el.estimateBtn.disabled = true;
    el.estimateBtn.textContent = "Estimating…";

    const inputs = getInputs();
    validateInputs(inputs);

    const forecasts = [];
    for (const roof of inputs.roofs) {
      const forecast = await fetchForecastForRoof(inputs, roof);
      forecasts.push(forecast);
    }

    const roofSeriesList = forecasts.map((forecast, idx) =>
      deriveRoofHourlyYield(inputs, inputs.roofs[idx], forecast)
    );

    const hourlyRows = combineHourly(roofSeriesList);
    const dailyRows = aggregateDaily(hourlyRows);

    updateStats(inputs, hourlyRows, dailyRows);
    buildRoofTotals(inputs, roofSeriesList);
    buildDailyTable(dailyRows);
    renderCharts(hourlyRows, dailyRows, roofSeriesList, inputs.roofs);

    const timezone = forecasts[0]?.timezone || "local";
    const currentLocationText = el.locationText.textContent.split(" · Forecast timezone:")[0];
    el.locationText.textContent = `${currentLocationText} · Forecast timezone: ${timezone}`;
  } catch (error) {
    console.error(error);
    alert(error.message || "Something went wrong while estimating yield.");
  } finally {
    el.estimateBtn.disabled = false;
    el.estimateBtn.textContent = "Estimate yield";
  }
}

el.estimateBtn.addEventListener("click", runEstimate);

el.useDublinBtn.addEventListener("click", () => {
  setLocation(53.3498, -6.2603, "Dublin, Ireland");
});

el.searchPlaceBtn.addEventListener("click", async () => {
  try {
    await searchPlace();
  } catch (error) {
    console.error(error);
    alert(error.message || "Place search failed.");
  }
});

el.placeInput.addEventListener("keydown", async (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    try {
      await searchPlace();
    } catch (error) {
      console.error(error);
      alert(error.message || "Place search failed.");
    }
  }
});

el.addRoofBtn.addEventListener("click", () => addRoofFace());
el.loadEastWestBtn.addEventListener("click", loadEastWestExample);

initMap();
loadEastWestExample();
runEstimate();

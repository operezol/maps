const MAP_API_TOKEN = `pk.eyJ1Ijoib3BlcmV6b2wiLCJhIjoiY2txeml6bDVsMDdtbzJ0bGd3a3gxbHJxNCJ9.uYL51pfHlejdqNMMbPfJOA`;
let zoomLevel = 23;

const getRandomLocations = () => {
  let locations = [];
  for (let i = 0; i < 1000; i++) {
    locations.push([41 + Math.random() + i, 2 + Math.random() + i]);
  }
  return locations;
};

let locationsHistory =
  localStorage.getItem("locationsHistory") === null
    ? []
    : JSON.parse(localStorage.getItem("locationsHistory"));

const getAverageLat = () => {
  let maxLat = locationsHistory[0][0];
  let minLat = locationsHistory[0][0];
  let averageLat = 0;
  for (let index = 0; index < locationsHistory.length; index++) {
    let currentLat = locationsHistory[index][0];
    if (maxLat < currentLat) maxLat = currentLat;
    if (minLat > currentLat) minLat = currentLat;
    averageLat += currentLat;
  }
  averageLat = averageLat / locationsHistory.length;
  return averageLat;
};

const getLocationsByAverage = (averageLat) => {
  let aboveAverageLat = [];
  let belowAverageLat = [];
  for (let index = 0; index < locationsHistory.length; index++) {
    let currentLat = locationsHistory[index][0];
    if (currentLat >= averageLat) {
      aboveAverageLat.push(locationsHistory[index]);
    } else {
      belowAverageLat.push(locationsHistory[index]);
    }
  }
  return [aboveAverageLat, belowAverageLat];
};

const sortLonAsc = (aboveAverageLat) => {
  return aboveAverageLat.sort((a, b) => {
    if (a[1] === b[1]) {
      return 0;
    } else {
      return a[1] < b[1] ? 1 : -1;
    }
  });
};

const trimLonAsc = (sortedLonAsc) => {
  for (let index = 1; index < sortedLonAsc.length - 1; index++) {
    if (
      sortedLonAsc[index - 1][0] > sortedLonAsc[index][0] &&
      sortedLonAsc[index][0] < sortedLonAsc[index + 1][0]
    ) {
      sortedLonAsc.splice(index, 1);
    }
  }
  return sortedLonAsc;
};

const sortLonDesc = (belowAverageLat) => {
  return belowAverageLat.sort((a, b) => {
    if (a[1] === b[1]) {
      return 0;
    } else {
      return a[1] < b[1] ? -1 : 1;
    }
  });
};

const trimLonDesc = (sortedLonDesc) => {
  for (let index = 1; index < sortedLonDesc.length - 1; index++) {
    if (
      sortedLonDesc[index - 1][0] < sortedLonDesc[index][0] &&
      sortedLonDesc[index][0] > sortedLonDesc[index + 1][0]
    ) {
      sortedLonDesc.splice(index, 1);
    }
  }
  return sortedLonDesc;
};

const orderPoligonHoleLocations = () => {
  let averageLat = getAverageLat();
  let [aboveAverageLat, belowAverageLat] = getLocationsByAverage(averageLat);
  let sortedLonAsc = sortLonAsc(aboveAverageLat);
  let sortedLonDesc = sortLonDesc(belowAverageLat);
  let trimedLonAsc = trimLonAsc(sortedLonAsc);
  let trimedLonDesc = trimLonDesc(sortedLonDesc);
  locationsHistory = [...trimedLonAsc, ...trimedLonDesc];
};

orderPoligonHoleLocations();

const getPoligonBoundaries = () => {
  let southWest = map.getBounds().getSouthWest();
  let northEast = map.getBounds().getNorthEast();
  let northWest = map.getBounds().getNorthWest();
  let southEast = map.getBounds().getSouthEast();
  return [southWest, northWest, northEast, southEast];
};
const redrawPoligon = () => {
  const poligonBoundaries = getPoligonBoundaries();
  orderPoligonHoleLocations();
  map.removeLayer(polygon);
  polygon = L.polygon([poligonBoundaries, locationsHistory], {
    fillColor: "black",
    fillOpacity: 1,
    stroke: false,
  }).addTo(map);
};
const saveLocationsOnLocalstorage = () => {
  if (locationsHistory) {
    orderPoligonHoleLocations();
    let strigifiedLocations = JSON.stringify(locationsHistory);
    localStorage.setItem("locationsHistory", strigifiedLocations);
  }
};
const onLocationFound = (e) => {
  locationsHistory.push([e.latitude, e.longitude]);
  orderPoligonHoleLocations();
  saveLocationsOnLocalstorage();
  redrawPoligon();
};
const onLocationError = (e) => {
  alert(e.message);
};
const onZoomend = (e) => {
  zoomLevel = e.target._zoom;
  orderPoligonHoleLocations();
  redrawPoligon();
};
let map = L.map("map").fitWorld();
let polygon = L.polygon([]).addTo(map);
L.tileLayer(
  `https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token=${MAP_API_TOKEN}`,
  {
    maxZoom: zoomLevel,
    attribution:
      'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, ' +
      'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    id: "mapbox/streets-v11",
    tileSize: 512,
    zoomOffset: -1,
  }
).addTo(map);
map.on("locationfound", onLocationFound);
map.on("locationerror", onLocationError);
map.on("zoomend", onZoomend);
map.on("resize", redrawPoligon);
map.on("unload", saveLocationsOnLocalstorage);
map.on("viewreset", redrawPoligon);
map.on("move", redrawPoligon);
map.locate({ setView: true, maxZoom: zoomLevel, watch: true });

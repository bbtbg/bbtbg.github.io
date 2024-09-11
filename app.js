    // Initialize the Leaflet.js map
    var map = L.map('map').setView([51.505, -0.09], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Layers for different building types
    var houseLayer = L.layerGroup();
    var apartmentLayer = L.layerGroup();
    var governmentLayer = L.layerGroup();
    var commercialLayer = L.layerGroup();
    var schoolLayer = L.layerGroup();
    var officeLayer = L.layerGroup();
    var retailLayer = L.layerGroup();
    var industrialLayer = L.layerGroup();

    // Add Layer Control
    var layerControl = L.control.layers(null, {
      'House': houseLayer,
      'Apartment': apartmentLayer,
      'Government': governmentLayer,
      'Commercial': commercialLayer,
      'School': schoolLayer,
      'Office': officeLayer,
      'Retail': retailLayer,
      'Industrial': industrialLayer
    }).addTo(map);

    document.getElementById('addressForm').addEventListener('submit', async function (e) {
      e.preventDefault();
      const address = document.getElementById('address').value;
      const minArea = document.getElementById('minArea').value;
      const errorMessage = document.getElementById('error-message');
      errorMessage.textContent = ''; // Clear previous errors

      try {
        // Geocode the address using Nominatim
        const geocodeResponse = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`);
        const geocodeData = await geocodeResponse.json();

        if (!geocodeData || geocodeData.length === 0) {
          showErrorMessage('Address not found. Please enter a valid address.');
          return;
        }

        const { lat, lon } = geocodeData[0]; // Extract the first result
        map.setView([lat, lon], 14);

        // Fetch building data (houses, apartments, government buildings, etc.) from Overpass API
        const buildingData = await getFilteredBuildings(lat, lon);
        if (!buildingData || buildingData.length === 0) {
          showErrorMessage('No buildings found in this area.');
          return;
        }

        // Clear previous layers
        clearLayers();

        // Filter and display the buildings based on area and type
        for (const building of buildingData) {
          const area = calculateArea(building.geometry);
          if (area > minArea) {
            const color = getBuildingColor(building.type);
            const layer = getLayerForBuilding(building.type);
            
            const polygon = L.polygon(building.geometry, { color }).addTo(layer);
            const address = await reverseGeocode(building.geometry[0]); // Get the address of the building
            
            polygon.bindPopup(`Building Type: ${building.type}<br>Area: ${area.toFixed(2)} m²<br>Address: ${address}`);
          }
        }

        // Add layers to map
        map.addLayer(houseLayer);
        map.addLayer(apartmentLayer);
        map.addLayer(governmentLayer);
        map.addLayer(commercialLayer);
        map.addLayer(schoolLayer);
        map.addLayer(officeLayer);
        map.addLayer(retailLayer);
        map.addLayer(industrialLayer);

      } catch (error) {
        showErrorMessage('An error occurred while fetching the data.');
      }
    });

    // Function to fetch building data from Overpass API with filters
    async function getFilteredBuildings(lat, lon) {
      const radius = 5000; // Radius for fetching buildings in meters
      const overpassUrl = `
        https://overpass-api.de/api/interpreter?data=[out:json];
        (
          way(around:${radius},${lat},${lon})[building=house];
          way(around:${radius},${lat},${lon})[building=apartments];
          way(around:${radius},${lat},${lon})[building=government];
          way(around:${radius},${lat},${lon})[building=commercial];
          way(around:${radius},${lat},${lon})[building=school];
          way(around:${radius},${lat},${lon})[building=office];
          way(around:${radius},${lat},${lon})[building=retail];
          way(around:${radius},${lat},${lon})[building=industrial];
        );
        out geom;
      `;
      const response = await fetch(overpassUrl);
      const data = await response.json();
      return data.elements.map(element => ({
        geometry: element.geometry.map(coord => [coord.lat, coord.lon]),
        type: element.tags.building
      }));
    }

    // Function to calculate the area of a polygon using Turf.js
    function calculateArea(geometry) {
      const coordinates = geometry.map(coord => [coord[0], coord[1]]);
      const polygon = turf.polygon([coordinates]);
      return turf.area(polygon);
    }

    // Function to reverse geocode (get address from coordinates)
    async function reverseGeocode(latLon) {
      const lat = latLon[0];
      const lon = latLon[1];
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
      const data = await response.json();
      return data.display_name || 'Address not found';
    }

    // Function to get the color based on building type
    function getBuildingColor(type) {
      switch (type) {
        case 'house': return 'blue';
        case 'apartments': return 'green';
        case 'government': return 'red';
        case 'commercial': return 'purple';
        case 'school': return 'orange';
        case 'office': return 'yellow';
        case 'retail': return 'pink';
        case 'industrial': return 'brown';
        default: return 'gray';
      }
    }

    // Function to get the appropriate layer for building type
    function getLayerForBuilding(type) {
      switch (type) {
        case 'house': return houseLayer;
        case 'apartments': return apartmentLayer;
        case 'government': return governmentLayer;
        case 'commercial': return commercialLayer;
        case 'school': return schoolLayer;
        case 'office': return officeLayer;
        case 'retail': return retailLayer;
        case 'industrial': return industrialLayer;
        default: return null;
      }
    }

    // Clear all layers
    function clearLayers() {
      houseLayer.clearLayers();
      apartmentLayer.clearLayers();
      governmentLayer.clearLayers();
      commercialLayer.clearLayers();
      schoolLayer.clearLayers();
      officeLayer.clearLayers();
      retailLayer.clearLayers();
      industrialLayer.clearLayers();
    }

    // Function to display an error message
    function showErrorMessage(message) {
      const errorMessage = document.getElementById('error-message');
      errorMessage.textContent = message;
    }

    // Legend
    var legend = L.control({ position: 'bottomright' });
    legend.onAdd = function () {
      var div = L.DomUtil.create('div', 'legend');
      div.innerHTML += '<i style="background: blue"></i> House<br>';
      div.innerHTML += '<i style="background: green"></i> Apartment<br>';
      div.innerHTML += '<i style="background: red"></i> Government<br>';
      div.innerHTML += '<i style="background: purple"></i> Commercial<br>';
      div.innerHTML += '<i style="background: orange"></i> School<br>';
      div.innerHTML += '<i style="background: yellow"></i> Office<br>';
      div.innerHTML += '<i style="background: pink"></i> Retail<br>';
      div.innerHTML += '<i style="background: brown"></i> Industrial<br>';
      return div;
    };
    legend.addTo(map);
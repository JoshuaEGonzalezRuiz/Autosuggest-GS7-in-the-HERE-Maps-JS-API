/* THE MAP IS INITIALIZED */

var latitude = 23.634501;

var longitude = -102.552784;

var platform = new H.service.Platform({
  apikey: constants.API_KEY,
});
var defaultLayers = platform.createDefaultLayers();

var map = new H.Map(
  document.getElementById("divMap"),
  defaultLayers.vector.normal.map,
  {
    center: { lat: latitude, lng: longitude },
    zoom: 12,
    pixelRatio: window.devicePixelRatio || 1,
  }
);

window.addEventListener("resize", () => map.getViewPort().resize());

var behavior = new H.mapevents.Behavior(new H.mapevents.MapEvents(map));

var ui = H.ui.UI.createDefault(map, defaultLayers);

var icon = new H.map.Icon("../icons/location.svg");

var defaultMarker = new H.map.Marker(
  { lat: latitude, lng: longitude },
  { icon: icon }
);
map.addObject(defaultMarker);

getLocation();

/* THE MAP IS INITIALIZED */

var direction = "";

function getLocation() {
  if (navigator.geolocation) {
    var options = {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 0,
    };
    navigator.geolocation.getCurrentPosition(geoSuccess, geoError, options);
  } else {
    alert("Geolocation is not supported by this browser.");
  }
}

function geoSuccess(position) {
  map.removeObject(defaultMarker);
  latitude = position.coords.latitude;
  longitude = position.coords.longitude;
  map.setCenter({ lat: latitude, lng: longitude });
  console.log("lat:" + latitude + " lng:" + longitude);
  console.log(`More or less ${position.coords.accuracy} meters.`);

  addMarker(map, latitude, longitude, icon);

  document.getElementById("ipt_lat").value = latitude;

  document.getElementById("ipt_lng").value = longitude;

  reverseGeocoding(latitude, longitude);
}

function geoError() {
  console.log("Geocoder failed.");
  reverseGeocoding(latitude, longitude);
}

function autoSuggestSearch() {
  direction = document.getElementById("ipt_geocoding").value;

  var xhr = new XMLHttpRequest();

  xhr.addEventListener("readystatechange", function () {
    if (this.readyState === 4) {
      var result = this.responseText;
      console.log("AutoSuggest Search result: " + result);

      var optionsArray = JSON.parse(result);

      var list = document.getElementById("list_suggestions");

      if (list.length > 0) {
        while (list.length > 0) {
          list.remove(0);
        }
      }

      var options = "";

      if (optionsArray != null) {
        for (let index = 0; index < optionsArray.items.length; index++) {
          var element = optionsArray.items[index].title;

          options += '<option value="' + element + '" />';
        }

        list.innerHTML = options;
        setGeocoding();
      }
    }
  });

  xhr.open(
    "GET",
    `https://autosuggest.search.hereapi.com/v1/autosuggest?apiKey=${constants.API_KEY}&q=${direction}&at=${latitude},${longitude}`
  );

  xhr.send();
}

function setGeocoding() {
  direction = document.getElementById("ipt_geocoding").value;

  var xhr = new XMLHttpRequest();

  xhr.addEventListener("readystatechange", function () {
    if (this.readyState === 4) {
      var result = this.responseText;
      console.log("Obtain geocode result: " + result);

      var optionsArray = JSON.parse(result);

      for (let index = 0; index < optionsArray.items.length; index++) {
        var title = optionsArray.items[index].title;

        if (direction.toUpperCase().includes(title.toUpperCase())) {
          var newPosition = optionsArray.items[index].position;

          latitude = newPosition.lat;
          longitude = newPosition.lng;

          map.setCenter({ lat: latitude, lng: longitude });
          map.setZoom(14);


          console.log(
            "New position set: " + latitude + "," + longitude
          );

          if (defaultMarker) {
            map.removeObject(defaultMarker);

            addMarker(map, latitude, longitude, icon);
          }
        }
      }
    }
  });

  xhr.open(
    "GET",
    `https://geocode.search.hereapi.com/v1/geocode?apiKey=${constants.API_KEY}&q=${direction}`
  );

  xhr.send();
}

function addMarker(map, lat, lng, icon) {
  defaultMarker = new H.map.Marker(
    {
      lat: lat,
      lng: lng,
    },
    { icon: icon, volatility: true }
  );

  defaultMarker.draggable = true;

  map.addObject(defaultMarker);

  // disable the default draggability of the underlying map
  // and calculate the offset between mouse and target's position
  // when starting to drag a marker object:
  map.addEventListener(
    "dragstart",
    function (ev) {
      var target = ev.target,
        pointer = ev.currentPointer;
      if (target instanceof H.map.Marker) {
        var targetPosition = map.geoToScreen(target.getGeometry());
        target["offset"] = new H.math.Point(
          pointer.viewportX - targetPosition.x,
          pointer.viewportY - targetPosition.y
        );
        behavior.disable();
      }
    },
    false
  );

  // re-enable the default draggability of the underlying map
  // when dragging has completed
  map.addEventListener(
    "dragend",
    function (ev) {
      var target = ev.target;
      if (target instanceof H.map.Marker) {
        behavior.enable();
      }

      //console.log(defaultMarker.getGeometry().lat);

      document.getElementById("ipt_lat").value =
        defaultMarker.getGeometry().lat;

      document.getElementById("ipt_lng").value =
        defaultMarker.getGeometry().lng;


    },
    false
  );

  // Listen to the drag event and move the position of the marker
  // as necessary
  map.addEventListener(
    "drag",
    function (ev) {
      var target = ev.target,
        pointer = ev.currentPointer;
      if (target instanceof H.map.Marker) {
        target.setGeometry(
          map.screenToGeo(
            pointer.viewportX - target["offset"].x,
            pointer.viewportY - target["offset"].y
          )
        );
      }
    },
    false
  );
}

function reverseGeocoding(lat, lng) {
  var xhr = new XMLHttpRequest();
  xhr.withCredentials = true;

  xhr.addEventListener("readystatechange", function () {
    if (this.readyState === 4) {
      console.log("Reverse geocoding result: " + this.responseText);
      var result = JSON.parse(this.responseText);

      document.getElementById("ipt_geocoding").value = result.items[0].title;

      autoSuggestSearch();
    }
  });

  xhr.open(
    "GET",
    `https://revgeocode.search.hereapi.com/v1/revgeocode?apiKey=${constants.API_KEY}&at=${lat},${lng}`
  );

  xhr.send();
}

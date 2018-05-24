// Initialize Firebase
var firebase = firebase.initializeApp(config);

// store variables and objects we want to use globally
var vehicles = {},
  vIds = [],
  currId,
  bounds,
  map = {},
  markerStore = {},

  fName = document.getElementById('name'),
  fEvent = document.getElementById('event'),
  fLat = document.getElementById('lat'),
  fLng = document.getElementById('lng'),
  fSpeed = document.getElementById('speed')

// authenticate user in order to connect to database for the first time
firebase.auth()
  .signInWithEmailAndPassword(auth_user, auth_pass)
  .then(function () {
    var user = firebase.auth().currentUser;
    if (user) {
      // User is signed in so get initial data
      var itemsRef = firebase.database().ref('LastReportedEvent');
      itemsRef.once('value',
        function (snapshot) {
          // populate our global object
          vehicles = snapshot.val();
          // initialise map
          initMap();
        })
    } else {
      console.log('failed login')
    }
  })
  .catch(function (error) {
    var elementMsg = '<h1>Snap!</h1><span>Map not loaded due to Auth failure</span>';
    document.getElementById('map').innerHTML = elementMsg;
    var errorCode = error.code;
    var errorMessage = error.message;
    console.log(errorMessage);
  });

/**
 * Creates a map object.
 */
function initMap() {
  // create global map object
  map = new google.maps.Map(document.getElementById('map'), {
    center: { lat: 0, lng: 0 },
    zoom: 3
  });
  // empty form values in event of browser refresh
  resetForm();
  // initialise other functionality for the app
  applyMarkers();
  selectVehicle(vIds);
  watchChanges();
}

/**
 * Generates markers on the map object.
 */
function applyMarkers() {
  // set up markers
  var marker;
  // create bounds object (only able to do this when map object has been initialised)
  bounds = new google.maps.LatLngBounds();
  // generate markers
  for (var key in vehicles) {
    var vehicle = vehicles[key];
    vIds.push({ id: key, name: vehicle.Name });
    marker = new google.maps.Marker({
      position: new google.maps.LatLng(vehicle.Lat, vehicle.Lon),
      map: map
    });
    // create a globally accessible reference to each marker
    markerStore[key] = marker
    bounds.extend(new google.maps.LatLng(vehicle.Lat, vehicle.Lon));
  }
  map.fitBounds(bounds);
  // re-evaluate bounds when window is resized
  var resizeListener = window.google.maps.event.addDomListener(
    window,
    'resize',
    function () {
      map.fitBounds(bounds);
    },
  );
}

/**
 * Gives functionality to the select menu.
 */
function selectVehicle(vehicles) {
  var select = document.getElementById("selectVehicle");
  // populate select menu with each vehicle and id
  for (var i = 0; i < vehicles.length; i++) {
    var opt = vehicles[i];
    var el = document.createElement("option");
    el.textContent = opt.name;
    el.value = opt.id;
    select.appendChild(el);
  }
  select.onchange = function (e) {
    // set global current id value
    currId = e.target.value
    var currVeh = {};
    // populate current vehicle data with correct object
    Object.keys(window.vehicles).forEach(function (key) {
      if (key === currId) { currVeh = window.vehicles[key] };
    });
    fName.value = currVeh.Name;
    fEvent.value = currVeh.EventDTUTC;
    fLat.value = currVeh.Lat;
    fLng.value = currVeh.Lon;
    fSpeed.value = currVeh.SpeedKmh;
    //center in on current vehicle coordinates
    map.setCenter(new google.maps.LatLng(currVeh.Lat, currVeh.Lon));
    map.setZoom(12);
    // if default select option id chosen, reset everything
    if (currId === "0") {
      map.fitBounds(bounds);
      resetForm();
    }
  }
}

/**
 * Form handling.
 */
var form = document.getElementById("form");
form.onsubmit = function (e) {
  e.preventDefault();
  // if there is a current Id set put current data from the form into the database
  if (currId != (undefined || 0)) {
    var itemsRef = firebase.database()
      .ref('LastReportedEvent/' + currId);
    itemsRef.set({
      Name: fName.value,
      EventDTUTC: fEvent.value,
      Lat: fLat.value,
      Lon: fLng.value,
      SpeedKmh: fSpeed.value,
    }).then(function () {
      console.log('Synchronization succeeded');
      // once data is in the database, update the App with the correct values 
      window.vehicles[currId].Lat = fLat.value;
      window.vehicles[currId].Lon = fLng.value
      markerStore[currId].setPosition(new google.maps.LatLng(fLat.value, fLng.value));

      bounds.extend(new google.maps.LatLng(fLat.value, fLng.value));

      map.setCenter(new google.maps.LatLng(fLat.value, fLng.value));
    }).catch(function (error) {
      console.log('Synchronization failed');
      console.log(error)
    });

  } else {
    console.log('no data yet')
  }
};

// watch for changes in the database
function watchChanges() {
  var itemsRef = firebase.database().ref('LastReportedEvent');
  itemsRef.on('child_changed', function (snapshot) {

    //get changed item and key
    var item = snapshot.val();
    var currKey = snapshot.ref.key

    // update the relevant marker on the map
    markerStore[currKey].setPosition(new google.maps.LatLng(item.Lat, item.Lon));

    // if we are looking at the changed vehicle act accordingly
    if (currId === currKey) {
      console.log('match');
      // update both form and global objects so all users will see the change
      fName.value = window.vehicles[currId].Name = item.Name;
      fEvent.value = window.vehicles[currId].EventDTUTC = item.EventDTUTC;
      fLat.value = window.vehicles[currId].Lat = item.Lat;
      fLng.value = window.vehicles[currId].Lon = item.Lon;
      fSpeed.value = window.vehicles[currId].SpeedKmh = item.SpeedKmh;
      map.setCenter(new google.maps.LatLng(fLat.value, fLng.value));
    }
  });
}

function resetForm(){
  fName.value = fEvent.value = fLat.value = fLng.value = fSpeed.value = '';
}
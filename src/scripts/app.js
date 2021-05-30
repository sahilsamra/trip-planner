const originFormElem = document.querySelector('.origin-form');
const originInputElem = document.querySelector('.origin-form input');
const destinationFormElem = document.querySelector('.destination-form');
const destinationInputElem = document.querySelector('.destination-form input');
const originsListElem = document.querySelector('.origins');
const destinationsListElem = document.querySelector('.destinations');
const planTripButton = document.querySelector('.plan-trip');
const recommendedTripHeading = document.querySelector('.recommended');
const recommenedContainer = document.querySelector('.recommended-container');
const alternativeTripHeading = document.querySelector('.alternative');
const alternativeContainer = document.querySelector('.alternative-container');
const mapboxBaseUrl = 'https://api.mapbox.com/geocoding/v5/';
const mapboxEndpoint = 'mapbox.places/';
const mapboxBboxParam = 'bbox=-97.325875, 49.766204, -96.953987, 49.99275';
const mapboxAccessToken = 'access_token=pk.eyJ1Ijoic2FoaWxzYW1yYSIsImEiOiJja3BhbXQ5NnMwcXV6Mm9wZTJiczdtbTJlIn0.CgFEh6GHolILO3aWMEYOxg';
const transitBaseUrl = 'https://api.winnipegtransit.com/v3/';
const transitEndpoint = 'trip-planner';
const transitAPIKey = 'api-key=z921V5IgEAs3tyTCEoBA';
const transitOriginParam = 'origin=geo/';
const transitDestinationParam = 'destination=geo/';

function getPossibleLocationsData(userSearch) {
  return fetch(`${mapboxBaseUrl}${mapboxEndpoint}${userSearch}.json?${mapboxBboxParam}&${mapboxAccessToken}`)
  .then(response => response.json())
  .then(data => data.features)
  .catch(error => console.log(error));
}

function getTripData(originLat, originLon, destLat, destLon) {
  return fetch(`${transitBaseUrl}${transitEndpoint}.json?${transitAPIKey}&${transitOriginParam}${originLat},${originLon}&${transitDestinationParam}${destLat},${destLon}`)
  .then(response => response.json())
  .catch(error => console.log(error));
}

function renderLocationsHTML(locationsObjArr, elemToAttachTo) {
  locationsObjArr.forEach(locationObj => {
    elemToAttachTo.insertAdjacentHTML('beforeend',
    `<li class="location" data-long="${locationObj.center[0]}" data-lat="${locationObj.center[1]}">
      <div class="name">${getLocationName(locationObj['place_name'])}</div>
      <div>${checkIfLocationHasAddress(locationObj)}</div>
    </li>`);
  });
}

function getLocationName(locationString) {
  return locationString.split(',')[0];
}

function checkIfLocationHasAddress(locationObj) {
  if (locationObj.properties.address === undefined) {
    return 'Winnipeg';
  } else {
    return locationObj.properties.address;
  }
}

function clearLists(element) {
  element.innerHTML = '';
}

function displayLocationInfo(inputElem, elemToAttachTo) {
  getPossibleLocationsData(inputElem.value)
  .then(data => {
    if (checkIfLocationExists(data, elemToAttachTo)) {
      clearLists(elemToAttachTo);
      renderLocationsHTML(data, elemToAttachTo);
    }
  })
}

function checkIfLocationExists(array, element) {
  if (array.length === 0) {
    element.textContent = 'No location with that name found.';
    return false;
  } else {
    return true;
  }
}

function changeSelectedClass(element, listType) {
  element.classList.add('selected');
  const allSelected = document.querySelectorAll(`.${listType} .selected`);
  allSelected.forEach(item => {
    item.classList.remove('selected');
  });
  element.classList.add('selected');
}

function checkForUserSelection() {
  const selectedOrigins = document.querySelectorAll('.origins .selected');
  const selectedDestinations = document.querySelectorAll('.destinations .selected');
  recommenedContainer.innerHTML = '';
  
  if (selectedOrigins.length === 0) {
    recommenedContainer.insertAdjacentHTML('afterbegin', '<p>Please select a starting location.</p>');
    return false;
  } else if (selectedDestinations.length === 0) {
    recommenedContainer.insertAdjacentHTML('afterbegin', '<p>Please select a destination.</p>');
    return false;
  } else {
    return true;
  }
}

function getUserOrigin() {
  const possibleOrigins = document.querySelectorAll('.origins li');
  let selectedOrigin;

  for (const locationItem of possibleOrigins) {
    if (locationItem.classList.contains('selected')) {
      selectedOrigin = locationItem;
    }
  }
  return selectedOrigin;
}

function getUserDestination() {
  const possibleDestinations = document.querySelectorAll('.destinations li');
  let selectedDestination;

  for (const locationItem of possibleDestinations) {
    if (locationItem.classList.contains('selected')) {
      selectedDestination = locationItem;
    }
  }
  return selectedDestination;
}

function callTripData() {
  const selectedOrigin = getUserOrigin();
  const selectedDestination = getUserDestination();
  let originLatitude;
  let originLongitude;
  let destinationLatitude;
  let destinationLongitude;

  originLatitude = selectedOrigin.getAttribute('data-lat');
  originLongitude = selectedOrigin.getAttribute('data-long');
  destinationLatitude = selectedDestination.getAttribute('data-lat');
  destinationLongitude = selectedDestination.getAttribute('data-long');
  if (checkIfOriginAndDestSame(originLatitude, originLongitude, destinationLatitude, destinationLongitude)) {
    return getTripData(originLatitude, originLongitude, destinationLatitude,destinationLongitude)
          .then(tripData => parseTripData(tripData))
          .then(parsedData => checkTripData(parsedData))
          .catch(error => console.log(error));
  } else {
    recommenedContainer.textContent = 'Origin and Destination are the same: Please enter unique locations';
  }  
}

function parseTripData(tripData) {
  let parsedTripData;

  parsedTripData = tripData.plans.map(plan => {
    return {
      number: plan.number,
      segments: parseSegmentsData(plan.segments),
    }
  });
  return parsedTripData;
}

function checkUndefined(tripPlan) {
  if (tripPlan.to === undefined) {
    return false;
  } else {
    return true;
  }
}

function parseSegmentsData(segmentPlan) {
  let parsedSegments;

  parsedSegments = segmentPlan.map(segment => {
    if (segment.type === 'walk') {
      if (checkUndefined(segment)) {
        return {
          type: segment.type,
          time: segment.times.durations.walking,
          stopNumber: checkProperty(segment.to.stop, 'key', ''),
          stopName: checkProperty(segment.to.stop, 'name', 'your destination'),
        }
      } else {
        return {
          type: segment.type,
          time: segment.times.durations.walking,
          stopNumber: '',
          stopName: 'your destination',
        }
      }  
    } else if (segment.type === 'ride') {
      return {
        type: segment.type,
        time: segment.times.durations.riding,
        routeNum: `Route ${segment.route.number}`,
        routeName: segment.route.name,
      }
    } else if (segment.type === 'transfer') {
      return {
        type: segment.type,
        fromStopNum: segment.from.stop.key,
        fromStopName: segment.from.stop.name,
        toStopNum: segment.to.stop.key,
        toStopName: segment.to.stop.name,
      }
    }
  })
  return parsedSegments;
}

function checkProperty(property, propKey, message) {
  if (property === undefined) {
    return message;
  } else {
    return property[`${propKey}`];
  }
}

function checkRouteName(routeObj) {
  if (routeObj.routeName === undefined) {
    return routeObj.routeNum;
  } else {
    return routeObj.routeName;
  }
}

function checkTripData(tripDataArray) {
  let alternativeArray = tripDataArray.slice(1);
  let recommendedArray = tripDataArray.slice(0, 1);

  if (tripDataArray.length === 0) {
    recommenedContainer.textContent = 'Sorry, no trip options available';
  } else if (tripDataArray.length === 1) {
    createTripUls(recommendedArray, recommendedTripHeading, recommenedContainer);
  } else {
    createTripUls(recommendedArray, recommendedTripHeading, recommenedContainer);
    createTripUls(alternativeArray, alternativeTripHeading, alternativeContainer);
  }
}

function checkIfOriginAndDestSame(originLat, originLon, destLat, destLon) {
  if (originLat === destLat && originLon === destLon) {
    return false;
  } else {
    return true;
  }
}

function createTripLi(tripSegment) {
  let liElem;
  
  if (tripSegment.type === 'walk') {
    if (tripSegment.stopNumber === '') {
      liElem = `<li><i class="fas fa-walking" aria-hidden="true"></i>Walk for ${tripSegment.time} minutes to ${tripSegment.stopName}.</li>`;
    } else {
      liElem = `<li><i class="fas fa-walking" aria-hidden="true"></i>Walk for ${tripSegment.time} minutes to stop #${tripSegment.stopNumber} - ${tripSegment.stopName}.</li>`;
    }
  } else if (tripSegment.type === 'ride') {
    liElem = `<li><i class="fas fa-bus" aria-hidden="true"></i>Ride the ${checkRouteName(tripSegment)} for ${tripSegment.time} minutes.</li>`;
  } else if (tripSegment.type === 'transfer') {
    liElem = `<li><i class="fas fa-ticket-alt" aria-hidden="true"></i>Transfer from stop #${tripSegment.fromStopNum} - ${tripSegment.fromStopName} to stop #${tripSegment.toStopNum} - ${tripSegment.toStopName}.</li>`;
  }
  return liElem;
}

function createAllTripLi(tripData) {
  let allLi = '';

  tripData.segments.forEach(item => {
    allLi += createTripLi(item)
  })
  return allLi;
}

function createTripUls(tripData, heading, container) {
  heading.style.display = 'block';
  container.innerHTML = '';

  tripData.forEach(trip => {
    container.insertAdjacentHTML('beforeend', `<ul class="trip-list">${createAllTripLi(trip)}</ul>`);
  }); 
}

function resetBusContainer() {
  recommendedTripHeading.style.display = 'none';
  alternativeTripHeading.style.display = 'none';
  recommenedContainer.innerHTML = '';
  alternativeContainer.innerHTML = '';
}

originFormElem.addEventListener('submit', event => {
  event.preventDefault();
  displayLocationInfo(originInputElem, originsListElem);
});

destinationFormElem.addEventListener('submit', event => {
  event.preventDefault();
  displayLocationInfo(destinationInputElem, destinationsListElem);
});

originsListElem.addEventListener('click', event => {
  const clickedLocation = event.target.closest('.location');
  changeSelectedClass(clickedLocation, 'origins');  
});

destinationsListElem.addEventListener('click', event => {
  const clickedLocation = event.target.closest('.location');
  changeSelectedClass(clickedLocation, 'destinations');
});

planTripButton.addEventListener('click', () => {
  resetBusContainer();
  
  if (checkForUserSelection()) {
    callTripData();    
  }   
});


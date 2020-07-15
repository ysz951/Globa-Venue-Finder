
'use strict';


const foursquareVenueURL = 'https://api.foursquare.com/v2/venues/search';
const foursquarePhotonURL = 'https://api.foursquare.com/v2/venues/';
const googleURL = 'https://maps.googleapis.com/maps/api/streetview';

// foursquare version
const v = '20200514';

// store the results id
const STORE = {};

// search name and category check
let checkBox = false;
let nameBox = false;

function formatQueryParams(params) {
  const queryItems = Object.keys(params)
    .map(key => ( params[key] ? `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}` : ''));
  return queryItems.join('&');
}

// use the regular expression to split input string
function getTokens(rawString) {
  return rawString.toUpperCase().split(/[ ,!.";:-]+/).filter(Boolean);
}

// fetch foursquare venue
function getFour(city, state, radius, query, categoryId, limit) {
  const params = {
    near:  `${city}, ${state}`,
    radius: radius,
    query: query,
    client_id: client_id,
    client_secret: client_secret,
    limit: limit,
    v: v,
    categoryId: categoryId
  };
  const queryString = formatQueryParams(params);
  // build the complete url
  const url = foursquareVenueURL + '?' + queryString;
  // clear error message
  $('#js-error-message').text('');
  fetch(url)
    .then(response => {
      if (response.ok) {
        return response.json();
      }
      throw new Error(response.statusText);
    })
    .then(responseJson => storeResponse(responseJson))
    .catch(err => {
      $('.error-message').show();
      $('#js-error-message').text(`Something went wrong: ${err.message}`);
    });
}

function storeResponse(responseJson){
  displayResults(responseJson);
}

function displayResults(responseJson) {
  
  // if there are previous results, remove them
  $('#results-list').empty();
  // if there is no result
  const resultData = responseJson.response.venues;
  if (resultData.length === 0){
    $('#results-list').append(
      `<li><h3>No results found</h3></li>`);
  }
  
  for (let i = 0; i < resultData.length; i++){
    const addressObject = resultData[i].location.formattedAddress.join(', ');
    const listId = cuid(); 
    // store each result list id as a new object, the value includes latitude and longitude
    STORE[`${listId}`]= new Object();
    Object.assign(STORE[`${listId}`], {"lat": resultData[i].location.lat, "lng": resultData[i].location.lng});
    
    if (i%2 === 0){
      $('#results-list').append(`<li class="subgroup_${~~(i/2)+1} result-list-group"></li>`);
    }

    // $(`#results-list`).append(
      $(`.subgroup_${~~(i/2)+1}`).append(
      `<div id="num-${listId}"><h3>${resultData[i].name}</h3> 
      ${resultData[i].categories.length ? `<p><strong>${resultData[i].categories[0].name}</strong></p>` : ''}
      <p>Location: ${addressObject ? `${addressObject}` : 'Not Found'}</p>
      <button type="button" class="show-map" id="button-${listId}"><span>Find More</span></button><br>
      </div>`
      );
    
    // append the result image into the result list
    getImage(resultData[i].id, listId);
  }
    
  // //display the results section  
  $('#results').removeClass('hidden');
  
  window.scrollTo(0,$('#results').position().top);
}


function getImage(venueId, listId){
  const params = {
    client_id: client_id,
    client_secret: client_secret,
    v: v,
  };

  const queryString = formatQueryParams(params)
  // build the complete url
  const url = foursquarePhotonURL + venueId + '/photos' + '?' + queryString;

  fetch(url)
    .then(response => {
      if (response.ok) {
        return response.json();
      }
      throw new Error(response.statusText);
    })
    // if the result image can be fetched from Foursquare
    .then(responseJson => imageRequest(responseJson.response.photos, listId))
    .catch(err => {
    // else, fetch the image from google
      googleImage(listId);
    });
}

// fetch the image from Google Static Street View
function imageRequest(photoResponse, listId){
  
  const photoItem = photoResponse.items[0];
  // if Foursqure has the image
  if (photoItem){
    // const imageSrc = photoItem.prefix + `${photoItem.width}x${photoItem.height}` + photoItem.suffix;
    const imageSrc = photoItem.prefix + '400x300' + photoItem.suffix;
    $(`#num-${listId}`).append(`<img src='${imageSrc}' alt="error">`)
  }
  // Else, fetch the result image from Google Static Street View 
  else{
    googleImage(listId)
  }
  
}

function googleImage(listId){
  const imageSize = '400x300';
  const params = {
    size: imageSize,
    location: `${STORE[listId].lat},${STORE[listId].lng}`,
    key: key,
  };
  const  queryString = formatQueryParams(params);
  const  url = googleURL + '?' + queryString;
  $(`#num-${listId}`).append(`<img src='${url}' alt="error">`)
}

// Street View

function closeImage(){
  $('.close').on('click',function(){
    $('#myModal').addClass('hidden');
  })
}

function streetViewClick(){
  $('ul').on('click','.show-map',function(event){
    
    event.preventDefault();
    const listId = this.id.split('-')[1];
    const lat = STORE[listId].lat;
    const lng = STORE[listId].lng;
    $('#myModal').removeClass('hidden')
    if (!($('#myModal')[0].classList.contains('hidden'))){
      initialize(lat,lng)
    }
  })
}


function initialize(lat,lng) {
  var fenway = {lat: lat, lng: lng};
  var map = new google.maps.Map($('#loc')[0], {
    center: fenway,
    zoom: 14
  });
  var panorama = new google.maps.StreetViewPanorama(
    $('#street')[0], {
        position: fenway,
        pov: {
          heading: 34,
          pitch: 10
        }
      });
  map.setStreetView(panorama);
}


// submit the search params
function getVenue(){
  $('form').submit(function(event) {
    event.preventDefault();
    let categoryId  = [];
    // get all selected categories 
    $('.category-group :checkbox:checked').each(function(i){
      categoryId[i] = $(this).val();
    });
    // get other params
    const city = $('#city').val(), state = $('#state').val(), query = $('#name').val(),
    //  transform the mile to meter (Foursqure request the meter as distance unit)
    radius = $('#radius').val() * 1609.344, limit = $('#limit').val();

    //  hide error message
    $('.error-message').hide();
    // hide street view
    $('#myModal').addClass('hidden');
    getFour(city, state, radius, query, categoryId, limit);
    })
}

// category checkbox real-time inspection
function selectChange(){
  $('.category-group').on('change',function(){
    let selectCheck = false;
    // once a category is selected set selectCheck to be true
    $('.category-group :checkbox:checked').each(function(i){
      selectCheck = true;
    });
    if (selectCheck){
      checkBox = true;
    }
    else{
      checkBox = false;
    }
    // only when search name is input or at least one category is selected, show the search radius option 
    if (nameBox || checkBox){
      $('.radius-group').show();
    }
    else{
      $('.radius-group').hide();
    }
  });

}

// search name input real-time inspection
function nameChange(){
  $('#name').keyup(function(){
    if ($('#name').val()){
      nameBox = true;
    }
    else{
      nameBox= false;
    }
    // only when search name is input or at least one category is selected, show the search radius option 
    if (nameBox || checkBox){
      $('.radius-group').show();
    }
    else{
      $('.radius-group').hide();
    }
  }
  )
 
}

function getChange(){
  selectChange(); 
  nameChange();
}

// clear icon 
function clearTextClick(){
  $('.clear-span').on('click',function(event){
    $(this).closest('div').find('input').val('');
    $(this).css('visibility',"hidden");
    // execute only when search name input is clear
    if (this.id === 'name-clear'){
      nameBox= false;
      if (nameBox || checkBox){
        $('.radius-group').show();
      }
      else{
        $('.radius-group').hide();
      }
    }
  })
}

function inputCheck(){
  $('.search-item').on('keyup','input',function(){
    if ($(this).val()){ 
      $(this).closest('div').find('span').css('visibility',"visible");
    }
    else{
      $(this).closest('div').find('span').css('visibility',"hidden");
    }
  }
  )
}


// When the user scrolls down 300px from the top of the document, show the button
function showTop(){
  window.onscroll = function(){scrollFunction()};
}

function scrollFunction() {
  // window.scrollTo(0,);
  if (document.body.scrollTop >= $('#results').position().top || document.documentElement.scrollTop >= $('#results').position().top) {
    $("#myBtn").show();
  } else {
    $("#myBtn").hide();
  }
}

function goTop(){
  $('.top-button').on('click','#myBtn',function(){
    
    document.body.scrollTop = '100%'; // For Safari
    document.documentElement.scrollTop = '100%'; // For Chrome, Firefox, IE and Opera
  }
  )
}

// main function
function mainFunc(){
  goTop();
  showTop();
  getVenue();
  getChange();
  streetViewClick();
  clearTextClick();
  inputCheck();
  closeImage();
}

$(mainFunc);


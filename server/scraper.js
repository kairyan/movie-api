
var cheerio = require('cheerio');
var request = require('request');
var http = require('http');
var async = require('async');

var queue = async.queue(createIMDB, 20);

queue.saturated = function() {
  console.log("queue saturated");
};

var scrapeController = {

  getData: function(req, res, next) {

    var zipcode = req.url.substring(1); // '/cats'
    var url = "http://www.google.com/movies?near=" + zipcode;
    var json = {};
    json.date = new Date();
    json.data = [];

    request(url, function(error, response, html) {
        // var $ = cheerio.load(html);
        // add code here
        var $ = cheerio.load(html);
        var theaters = $('#movie_results .theater');

        // make sure all theaters are done before returning
        var theater_counter = theaters.length;
        console.log("theater_counter", theater_counter);

        theaters.each(function(i, elem) {
          var parent = $(this);

          createTheater(parent, $, function(theater){

            json.data.push(theater);
            theater_counter --;
            console.log("theater created, counter is now", theater_counter);
            if (theater_counter === 0) {
              json.status = '200';
              res.json(json);
            }
          });
        });
    });
  }
};

module.exports = scrapeController;

function createTheater(parent, $, callback) {
  //theater object that contains name of theater and films playing
  var theater = {};
  theater.theater_name = parent.find('h2').text();

  //get address and phone number of each theater
  var info = parent.find('.desc .info').text();
  var arr = info.split(' - ');
  theater.address = arr[0];
  theater.phone = arr[1];

  //select films playing in theater
  var films = parent.find('.movie');

  //array of films playing in theater
  theater.films = [];

  // count for knowing when all async http requests are done
  var counter = films.length;
  console.log("films count ", counter);

  films.each(function(i, elem) {
    var film = {};
    //select tile of film
    film.title = $(this).find('.name').text();

    //make array of showtimes for each film
    film.available_showtimes = [];
    //get only the showtimes that aren't passed already
    $(this).find('.times>span').each(function(j, elem) {
      if ($(this).css('color') !== "#666") 
        film.available_showtimes.push($(this).text().trim());
    });

    //get imdb link for each film
    var imdb = $(this).find('.info')[0].lastChild;

    if (imdb.attribs) {
      if (imdb.attribs.href.charAt(18) === 'i') {
        // film.imdb = createIMDB();
        queue.push(imdb.attribs.href.substring(7, imdb.attribs.href.indexOf('&')), function(data) {

          console.log("finished processing data");
          film.imdb = data;
          counter -= 1;
          theater.films.push(film);
          console.log("pushing film", film);
          console.log("finished film, counter = ", counter);
          if (counter === 0) {
            //push each film object onto the films array of the each theater
            callback(theater);
          }
        });
      } 
      else {
          film.imdb = "n/a";
          counter -= 1;
          if (counter === 0) {
            callback(theater);        
          }
      }
    } 
    else {
      film.imdb = "n/a";
      counter -= 1;
      if (counter === 0) {
        callback(theater);        
      }
    }

  });
}

function createIMDB(url, callback) {

  var id = url.split('/')[4];
  var omdb_url = "http://www.omdbapi.com/?r=json&i=" + id;
  var imdb = {};
  imdb.url = url;

  request(omdb_url, function(error, response, html) {
    console.log(omdb_url);
    // console.log(res.statusCode);
    // console.log(res.body);
    // console.log(res);
    imdb.data = JSON.parse(html);
    callback(imdb);
  });

}


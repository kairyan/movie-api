var express = require('express');
var app = express();
var scraperController = require('./scraper');

app.use(scraperController.getData);

// first sample route
app.get('/', scraperController.getData);

app.listen(process.env.PORT || 3000);

module.exports = app;
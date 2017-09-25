
//Dependencies
const express = require("express");
const bodyParser = require("body-parser");
const exphbs = require("express-handlebars");
const mongoose = require("mongoose");

// Modules used for scraping
const request = require("request");
const cheerio = require("cheerio");

// Custom Models
const Article = require("./models/Article.js");
const Note = require("./models/Note.js");

// Sets Mongoose to leverage built in Javascript ES6 promises
mongoose.Promise = Promise;

var port = 3002;
var app = express();

// Uses body-parser
app.use(bodyParser.urlencoded({ extended: false }));

// Sets public as a static directory
app.use(express.static("public"));

app.engine("handlebars", exphbs({ defaultLayout: "main" }));
app.set("view engine", "handlebars");

// Remote connection
//mongoose.connect("mongodb://heroku_6917mpm0:lp7v7bu472gbkapcbnfh69qi0h@ds147864.mlab.com:47864/heroku_6917mpm0");
// Local Connection
mongoose.connect("mongodb://localhost/newsscraper", { useMongoClient: true });
var db = mongoose.connection;

// Console logs any mongoose errors
db.on("error", function(err) {
  console.log("Mongoose Error: ", err);
});

// Logs a success message once logged into the DB via Mongoose
db.once("open", function() {
  console.log("Mongoose connection successful.");
});

//===========
// Routes
//===========

// Main route 
app.get("/", function(req, res) {
  res.render("index");
});

// A GET request route to scrape our website
app.get("/scrape", function(req, res) {

  //Var to count how many articles were added
  var count = 0;

  //Use request to grab the body of the HTML page
  request("https://www.reddit.com/r/OnePiece/", function(error, response, html) {
    //Load the html into Cheerio and save it to var $
    const $ = cheerio.load(html);

    //For each a tag with class title and may-blank
    $("div.thing").each(function(i, element){

      count++;

      //Saves an empty result object
      var result = {};

      //Stores the title and URI as properties of the result object
      result.title = $(element).find("div.entry.unvoted").find("div.top-matter").find("p.title").find("a").text();
      result.link = $(element).find("div.entry.unvoted").find("div.top-matter").find("p.title").find("a").attr("href");
      result.image = $(element).attr("data-url");

      //Using the model, creates a new entry with the results object and its properties
      const entry = new Article(result);

      //Saves the entry to the DB
      entry.save(function(err, doc) {
        //Logs any errors
        if (err)  {
          console.log(err);
        }
        //Or logs the doc
        else {
          console.log(doc);
        }
      });
    });
  });
  //Tells the browser that the scrape is complete.
  res.send(`Scrape Complete, ${count} new articles logged`);
});

// GETS all Articles in the database
app.get("/articles", function(req, res) {

  //Finds all articles saved in the DB
  Article.find({}, function(err, doc) {

    //If err, throws err
    if (err) res.send(err);
    //Else, sends results to browser
    else res.send(doc);

  });
});

// A GET request for an Object's Note
app.get("/articles/:id", function(req, res) {

  //Finds the article with the equivalent Mongoose ID to the req.params.id
  Article.find({_id: mongoose.Types.ObjectId(req.params.id)})
    .populate("note")
    .exec(function(err, doc) {
      //If err, send err
      if(err) res.send(err);
      //Else, send the first result in the array
      else res.send(doc[0]);
    });

});

// POST route used to edit an article's notes 
app.post("/articles/:id", function(req, res) {

  //Stores 
  const entry = new Note(req.body);
  entry.save(function(err, doc){
    //Logs any errors
    if(err) console.log(err);
    //Else, logs the doc
    else console.log(doc);
  });

  //Then, finds the Article with req.param.id and adds to it's note properties with the new note's _ID
  Article.findOneAndUpdate(
    { _id: mongoose.Types.ObjectId(req.params.id) },
    { $push: { note: entry._id }},
    { new: true },
    function(err, doc) {
      //If err, sends err
      if(err) res.send(err);
      //Else, sends doc
      else res.send(doc);
    });

});

//Listens on port 
app.listen(port, function() {
  console.log("App running on port", port);
});



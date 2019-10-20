const path = require("path");
const express = require("express");

const app = express();
const port = process.env.PORT || "8000";

const bodyParser = require("body-parser");

const MongoClient = require('mongodb').MongoClient;

const multer = require('multer');

let storage = multer.diskStorage(
  {
    destination: './public/uploads/',
    filename: function (res, file, cb) {
      cb(null, file.originalname);
    }
  }
);

let upload = multer({storage: storage});

const user = 'bigboy';
const pw = 'bigboys.nyc2019';

var db;

app.use(bodyParser());

MongoClient.connect('MONGO', (err, client) => {
  if (err) return console.log(err)
    db = client.db('taggr')
  app.listen(port, () => {
    console.log('Listening on ' + port)
  })
});

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");

app.use(express.static(path.join(__dirname, "public")));
//app.use(express.static("uploads"));

app.get("/", (req, res) => {
  db.collection('tags').find().sort( {count: -1}).limit(3).toArray(function(mErr, mRes) {
    if (mErr) throw mErr;
    let tags = [];
    mRes.forEach(function(e) {
      tags.push(e.tag + ": " + e.count);
    })

    console.log(tags);
    res.render("index", { title: "Home", topTags: tags, isAuthenticated: true });
  })
});

app.get("/user", (req, res) => {
  res.render("user", { title: "Profile", userProfile: { nickname: "BigBoy" } });
});

app.get("/login", (req, res) => {
  res.redirect("/");
})

app.get("/tag/:hashtag", (req, res) => {
  if (req.params.hashtag=="") res.redirect('/');
  req.params.hashtag = req.params.hashtag.toUpperCase();

  let timeKO = Math.round(new Date().getTime()/1000) - (24 * 3600);

  db.collection('test').find({ hashtag : req.params.hashtag, timestamp : { $gte : timeKO } }).toArray(function(mErr, mRes) {
    if (mErr) throw mErr;
    let imgs = [];
    mRes.forEach(function(e) {
      imgs.push(e.filename);
    })
    res.render("gallery", { title: req.params.hashtag, images: imgs })
  })
})

app.post('/testpost', upload.single('image'), function(req, res, next) {
  if (req.body.hashtag == '') res.redirect('/');
  req.body.hashtag = req.body.hashtag.toUpperCase();
  req.body.filename = req.file.originalname;
  req.body.timestamp = Math.round(new Date().getTime()/1000);

  db.collection('test').insertOne(req.body, (err, result) => {
    if (err) return console.log(err)

    db.collection('tags').update(
      {tag: req.body.hashtag},
      {$inc: {count: 1}},
      {upsert: true},
      function (err, data) {
        if (err) return console.log(err);
        res.redirect('/tag/'+req.body.hashtag)
      }
    )
  })
})

'use strict';

const path = require("path");
const express = require("express");
const app = express();
const port = process.env.PORT || "8000";
const bodyParser = require("body-parser");
const MongoClient = require('mongodb').MongoClient;
const multer = require('multer');
const sha512 = require('js-sha512');

//******************************************************************************

const storedConfig = require('./config.js');

const config = {
  host: storedConfig.storedConfig.host,
  user: storedConfig.storedConfig.user,
  password: storedConfig.storedConfig.password
}

let storage = multer.diskStorage(
  {
    destination: './public/uploads/',
    filename: function (res, file, cb) {
      cb(null, file.originalname);
    }
  }
);

let upload = multer({storage: storage});

const salt = config.salt;
const user = config.user;
const pw = config.password;

var db;

//******************************************************************************

app.use(bodyParser.urlencoded({
  extended: true
}));

MongoClient.connect(config.host, (err, client) => {
  if (err) return console.log(err)
    db = client.db('taggr')
  app.listen(port, () => {
    console.log('Listening on ' + port)
  })
});

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");

app.use(express.static(path.join(__dirname, "public")));

//******************************************************************************

var genSalt = function() {
    return "123abc";
};

var getSha = function(password){
    let tmpSalt = genSalt();
    return {
        salt: tmpSalt,
        passwordHash: sha512.hmac(tmpSalt, password)
    };
};

//******************************************************************************

app.get("/", (req, res) => {

  db.collection('tags').find().sort( {count: -1}).limit(3).toArray(function(mErr, mRes) {
    if (mErr) throw mErr;
    let tags = [];
    mRes.forEach(function(e) {
      tags.push(e.tag + ": " + e.count);
    })

    res.render("index", { title: "Home", topTags: tags });
  })
});

app.get("/user", (req, res) => {
  res.render("user", { title: "Profile", userProfile: { nickname: "BigBoy" } });
});

app.get("/login", (req, res) => {
  res.render("login");
})

app.post("/login", (req, res) => {

  if (req.body.email === "" || req.body.password === "") {
    res.redirect("/");
  }

  let hashedPass = getSha(req.body.password);

  db.collection('users').find({ $or : [ { email : req.body.email }, { username : req.body.email } ], password : hashedPass.passwordHash}).limit(1).toArray(function(mErr, mRes) {
    console.log(mRes);
    if (mRes.length != 0) {
      res.redirect("/user");
    } else {
      res.redirect("/login");
    }
  })

})

app.get("/signup", (req, res) => {
  res.render("signup");
})

app.post("/signup", (req, res) => {

  if (req.body.username === "" || req.body.email === "" || req.body.password === "") {
    res.redirect("/signup");
  }

  let hashedPass = getSha(req.body.password);

  let newUser = {
    username: req.body.username,
    email: req.body.email,
    password: hashedPass.passwordHash,
    salt: hashedPass.salt
  }

  console.log(newUser);

  db.collection('users').insertOne(newUser, (err, result) => {
    if (err) return console.log(err);
    res.redirect("/");
  })
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

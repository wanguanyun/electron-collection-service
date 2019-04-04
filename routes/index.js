var express = require('express');
var bodyParser = require('body-parser')
var multer = require('multer');
var fs = require('fs');
var path = require('path');

// var upload = multer({ dest: 'uploads/' });
var router = express.Router();

// create application/json parser 用于处理json
var jsonParser = bodyParser.json()
// create application/x-www-form-urlencoded parser 用于处理form
var urlencodedParser = bodyParser.urlencoded({
  extended: false
})

/* GET home page. */
router.get('/', (req, res, next) => {
  let result = {
    name: 'hello'
  }
  console.dir("111")
  res.send(result)
});


router.post('/post', urlencodedParser, (req, res, next) => {
  console.dir(req.body)
  res.send("post ok")
});


module.exports = router;
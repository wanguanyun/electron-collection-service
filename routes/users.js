var express = require('express');
var bodyParser = require('body-parser')
var jwt = require('jsonwebtoken'); // 使用jwt签名
var bcrypt = require('bcryptjs'); //数据加密
var router = express.Router();


let result = require('../config/result');//返回数据统一model
const db = require('../config/db');
const {
  secretKey,
  pw_hash,
  generate_token
} = require('../config/jwt');


// // create application/json parser 用于处理json
// var jsonParser = bodyParser.json()
// // create application/x-www-form-urlencoded parser 用于处理form
// var urlencodedParser = bodyParser.urlencoded({ extended: false })

/* GET users listing. */
router.get('/', (req, res, next) => {
  db.query("select * from collection_user", function (err, rows) {
    if (!err){
      res.send(new result(rows,"success",200));
    }
  });
});
router.post('/register', (req, res, next) => {
  const param = req.body;
  console.log(req.body)
  db.query(`insert into collection_user VALUES('${param.username}','${pw_hash(param.password)}')`).then(data => {
    res.send("success");
  }).catch(err => {
    res.send(err);
  })
});
router.post('/login', (req, res, next) => {
  const param = req.body;
  const user = {
    username: param.username,
    password: param.password
  }
  db.query(`select password from collection_user WHERE username = '${user.username}'`).then(data => {
    if (data.rows && data.rows.length == 1) {
      if (bcrypt.compareSync(user.password, data.rows[0].password)) {
        //密码匹配通过
        const token = generate_token(user);
        res.send(new result({token},"success",200));
      } else {
        //密码匹配不正确
        res.send(new result(null,'密码瞎输啥呢？',500));
      }
    } else {
      //无该用户
      res.send(new result(null,'输的啥用户名？',500));
    }
  }).catch(err => {
    res.send(new result(null,'出现错误了！',500));
  })
});

module.exports = router;
var express = require('express');
var bodyParser = require('body-parser')
var jwt = require('jsonwebtoken'); // 使用jwt签名
var bcrypt = require('bcryptjs'); //数据加密
var router = express.Router();
var uuid = require('node-uuid');
var moment = require('moment');


let result = require('../config/result'); //返回数据统一model
const db = require('../config/db');
const {
  secretKey,
  pw_hash,
  generate_token,
  verify_token
} = require('../config/jwt');


// // create application/json parser 用于处理json
// var jsonParser = bodyParser.json()
// // create application/x-www-form-urlencoded parser 用于处理form
// var urlencodedParser = bodyParser.urlencoded({ extended: false })

/* GET users listing. */
router.post('/info', (req, res, next) => {
  const param = req.body;
  const token = param.token;
  db.query(`select * from collection_user where username = '${verify_token(token).username}'`).then(data => {
    if (data.rows && data.rows.length == 1) {
      res.send(new result({
        userName:data.rows[0].username,
        userId:data.rows[0].userid,
        default_avatar:data.rows[0].default_avatar,
        gallery_img:data.rows[0].gallery_img,
        gallery_item_img:data.rows[0].gallery_item_img,
        last_login_time:data.rows[0].last_login_time,
        app_module:data.rows[0].app_module,
        default_dashboard_item_number:data.rows[0].default_dashboard_item_number,
        default_dashboard_number:data.rows[0].default_dashboard_number,
      }, "success", 200));
    }
  }).catch(err => {
    res.send(err);
  })
});
router.post('/register', (req, res, next) => {
  const usrId = uuid.v1();
  const param = req.body;
  const nowTime = moment().format('YYYY-MM-DD HH:mm')
  console.log(req.body)
  db.query(`select * from collection_config`).then(data => {
    let config = {};
    for (let item of data.rows) {
      config[item.config_name] = item.config_contant;
    }
    console.log(config)
    db.query(`insert into collection_user VALUES('${param.username}','${pw_hash(param.password)}','${usrId}',
    '${config.default_avatar?config.default_avatar:""}','${config.default_gallery_cover?config.default_gallery_cover:""}',
    '${config.default_gallery_item_cover?config.default_gallery_item_cover:""}','${nowTime}','${nowTime}',1,
    '${config.default_dashboard_item_number?config.default_dashboard_item_number:""}','${config.default_dashboard_number?config.default_dashboard_number:""}')`).then(data => {
      res.send("success");
    }).catch(err => {
      res.send(err);
    })
  }).catch(err => {
    db.query(`insert into collection_user VALUES('${param.username}','${pw_hash(param.password)}','${usrId}','','','','${nowTime}','${nowTime}',1,10,10)`).then(data => {
      res.send("success");
    }).catch(err => {
      res.send(err);
    })
  })
});

//修改密码功能
router.post('/changepw', (req, res, next) => {
  const param = req.body;
  const token = req.headers.authorization.split("Bearer")[1].trim();
  const user = {
    username: verify_token(token).username,
    password: param.newPassword
  }
  db.query(`select * from collection_user WHERE username = '${verify_token(token).username}'`).then(data => {
    if (data.rows && data.rows.length == 1) {
      if (bcrypt.compareSync(param.oldPassword, data.rows[0].password)) {
        //密码匹配通过
        const token = generate_token(user);
        console.log(data.rows)
        db.query(`update collection_user set password = '${pw_hash(param.newPassword)}' WHERE userid = '${data.rows[0].userid}'`).then(data2 => {
          res.send(new result({
            token,
            userName:data.rows[0].username,
            userId:data.rows[0].userid,
            default_avatar:data.rows[0].default_avatar,
            gallery_img:data.rows[0].gallery_img,
            gallery_item_img:data.rows[0].gallery_item_img,
            last_login_time:data.rows[0].last_login_time,
            app_module:data.rows[0].app_module,
            default_dashboard_item_number:data.rows[0].default_dashboard_item_number,
            default_dashboard_number:data.rows[0].default_dashboard_number,
          }, "success", 200));
        }).catch(err => {
          res.send(new result(null, '更新用户密码失败！', 500));
        })
      }else{
        res.send(new result(null, '无法匹配用户密码！', 500));
      }
    }
  }).catch(err =>{
    res.send(new result(null, '获取用户信息失败！', 500));
  })
});

router.post('/login', (req, res, next) => {
  const param = req.body;
  const nowTime = moment().format('YYYY-MM-DD HH:mm');
  const user = {
    username: param.username,
    password: param.password
  }
  db.query(`select * from collection_user WHERE username = '${user.username}'`).then(data => {
    if (data.rows && data.rows.length == 1) {
      if (bcrypt.compareSync(user.password, data.rows[0].password)) {
        //密码匹配通过
        const token = generate_token(user);
        res.send(new result({
          token,
          userName:data.rows[0].username,
          userId:data.rows[0].userid,
          default_avatar:data.rows[0].default_avatar,
          gallery_img:data.rows[0].gallery_img,
          gallery_item_img:data.rows[0].gallery_item_img,
          last_login_time:data.rows[0].last_login_time,
          app_module:data.rows[0].app_module,
          default_dashboard_item_number:data.rows[0].default_dashboard_item_number,
          default_dashboard_number:data.rows[0].default_dashboard_number,
        }, "success", 200));
        db.query(`update collection_user set new_login_time = '${nowTime}',last_login_time = '${data.rows[0].new_login_time}' WHERE userid = '${data.rows[0].userid}'`)
      } else {
        //密码匹配不正确
        res.send(new result(null, '密码瞎输啥呢？', 500));
      }
    } else {
      //无该用户
      res.send(new result(null, '输的啥用户名？', 500));
    }
  }).catch(err => {
    res.send(new result(null, '出现错误了！', 500));
  })
});

module.exports = router;
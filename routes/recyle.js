var express = require('express');
var bodyParser = require('body-parser')
var multer = require('multer');
var fs = require('fs');
var jwt = require('jsonwebtoken'); // 使用jwt签名
var bcrypt = require('bcryptjs'); //数据加密
var path = require('path');
var moment = require('moment');
var uuid = require('node-uuid');

var router = express.Router();
const fileType = ['image/jpeg', 'image/pjpeg', 'image/gif', 'image/png', 'image/x-png']
let result = require('../config/result'); //返回数据统一model
const db = require('../config/db');
const {
    secretKey,
    pw_hash,
    generate_token,
    verify_token
} = require('../config/jwt');

var createFolder = function (folder) {
    try {
        fs.accessSync(folder);
    } catch (e) {
        fs.mkdirSync(folder);
    }
};
var uploadFolder = './upload/';

createFolder(uploadFolder);

// 通过 filename 属性定制
var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadFolder); // 保存的路径，备注：需要自己创建
    },
    filename: function (req, file, cb) {
        // 将保存文件名设置为 字段名 + 时间戳，比如 logo-1478521468943
        cb(null, file.originalname);
    }
});

// 通过 storage 选项来对 上传行为 进行定制化
var upload = multer({
    storage: storage,
    //设置只能上传图片
    fileFilter: function (req, file, cb) {
        if (fileType.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('只能传小姐姐图片!'))
        }
    },
    //限制文件上传10M内
    limits: {
        fileSize: 10 * 1024 * 1024
    }
})

//获取回收站详情
router.get('/list', (req, res, next) => {
    let myResult = []
    let query1 = db.query(`SELECT * FROM collection_gallery_item a LEFT JOIN collection_gallery b ON a.gallery_id = b.gallery_id  WHERE a.gallery_item_del_flag = 0`)
    let query2 = db.query(`SELECT * FROM collection_gallery WHERE gallery_del_flag = 0`)
    Promise.all([query1, query2]).then((data) => {
        data[0].rows.forEach(item => {
            item.create_time = moment(item.create_time,"YYYYMMDDHHmm").format("YYYY-MM-DD HH:mm")
            myResult.push(item)
        });
        data[1].rows.forEach(item => {
            item.create_time = moment(item.create_time,"YYYYMMDDHHmm").format("YYYY-MM-DD HH:mm")
            myResult.push(item)
        });
        res.send(new result(myResult, 'success', 200))
    }).catch((err) => {
        res.send(new result(null, err, 500))
    })
});

//获取首页所有图集小类
router.post('/gallery/restore', (req, res, next) => {
    const param = req.body;
    if(param.gallery_item_name){
        //图集小类还原
        db.query(`UPDATE collection_gallery_item SET gallery_item_del_flag = 1 WHERE gallery_item_id = '${param.gallery_item_id}'`).then(data => {
            res.send(new result("图集小类还原成功", "success", 200));
        }).catch(err => {
            res.send(err);
        })
    }else{
        db.query(`UPDATE collection_gallery SET gallery_del_flag = 1 WHERE gallery_id = '${param.gallery_id}'`).then(data => {
            res.send(new result("图集大类还原成功", "success", 200));
        }).catch(err => {
            res.send(err);
        })
    }
});

module.exports = router;
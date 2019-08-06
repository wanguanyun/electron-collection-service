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
//获取首页常用标签
router.get('/hot/tag', (req, res, next) => {
    db.query(`SELECT gallery_tag FROM collection_gallery WHERE gallery_del_flag = 1`).then(data => {
        let hotTag = {};
        let sortArr = [];
        for (let item of data.rows) {
            for(let item_in of item.gallery_tag.split(",")){
                if(hotTag[item_in] != undefined){
                    hotTag[item_in] += 1
                }else{
                    hotTag[item_in] = 1
                }
            }
        }
        for(var key in hotTag){
            sortArr.push({tagName:key,tagCount:hotTag[key]})
        }
        sortArr.sort((a,b)=>{
            return parseInt(b.tagCount) - parseInt(a.tagCount)
        });
        res.send(new result(sortArr, "success", 200));
    }).catch(err => {
        res.send(err);
    })
});

//获取首页所有图集小类
router.post('/hot/gallery/item', (req, res, next) => {
    const param = req.body;
    db.query(`SELECT * FROM collection_gallery_item a  LEFT JOIN collection_gallery b ON a.gallery_id = b.gallery_id 
    LEFT JOIN collection_img c ON a.gallery_item_cover = c.img_id
    WHERE a.gallery_item_del_flag = 1 AND a.gallery_item_rank > 4 
    ORDER BY gallery_item_rank DESC`).then(data => {
        //随机从数组中选取n个
        let randomResult= data.rows.sort(()=>0.5-Math.random()).slice(0,(param.gallery_item_num?param.gallery_item_num:10));
        //特殊处理下 本地文件夹地址 前端只读取gallery_local字段
        randomResult.forEach(item => {
            item.gallery_local = item.gallery_item_local
            return item
        });
        res.send(new result(randomResult, "success", 200));
    }).catch(err => {
        res.send(err);
    })
});

//获取首页轮播图图集小类
router.get('/hot/carousel/item', (req, res, next) => {
    db.query(`SELECT * FROM collection_gallery_item a  LEFT JOIN collection_gallery b ON a.gallery_id = b.gallery_id 
    LEFT JOIN collection_img c ON a.gallery_item_cover = c.img_id
    WHERE a.gallery_item_del_flag = 1 AND a.gallery_item_rank = 5 
    ORDER BY gallery_item_rank DESC`).then(data => {
        //随机从数组中选取n个
        let randomResult= data.rows.sort(()=>0.5-Math.random()).slice(0,5);
        res.send(new result(randomResult, "success", 200));
    }).catch(err => {
        res.send(err);
    })
});

//获取首页所有图集大类
router.post('/hot/gallery', (req, res, next) => {
    const param = req.body;
    db.query(`SELECT * FROM collection_gallery a LEFT JOIN collection_img b ON a.gallery_cover = b.img_id
    WHERE a.gallery_del_flag = 1 AND a.gallery_rank > 4 
    ORDER BY gallery_rank DESC`).then(data => {
        //随机从数组中选取n个
        let randomResult= data.rows.sort(()=>0.5-Math.random()).slice(0,(param.gallery_num?param.gallery_num:10));
        res.send(new result(randomResult, "success", 200));
    }).catch(err => {
        res.send(err);
    })
});


module.exports = router;
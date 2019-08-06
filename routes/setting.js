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

//修改APP隐私模式
router.post('/modify/appmodule', (req, res, next) => {
    const param = req.body;
    const token = req.headers.authorization.split("Bearer")[1].trim();
    db.query(`update collection_user set app_module = ${param.appModule} where username = '${verify_token(token).username}'`).then(data => {
        res.send(new result("切换隐私模式成功", "success", 200));
    }).catch(err => {
        res.send(err);
    })
});

//修改首页图集大/小类展示个数
router.post('/modify/dashboard/number', (req, res, next) => {
    const param = req.body;
    const token = req.headers.authorization.split("Bearer")[1].trim();
    db.query(`update collection_user set default_dashboard_item_number = ${param.default_dashboard_item_number},default_dashboard_number = ${param.default_dashboard_number} where username = '${verify_token(token).username}'`).then(data => {
        res.send(new result("更新首页配置成功", "success", 200));
    }).catch(err => {
        res.send(err);
    })
});

//修改头像 重置头像
router.post('/modify/avatar', upload.single('imgfile'), (req, res, next) => {
    const param = req.body;
    const token = req.headers.authorization.split("Bearer")[1].trim();
    if (!req.file) {
        //未上传图片文件 使用默认头像
        db.query(`select * from collection_config`).then(data => {
            let config = {};
            for (let item of data.rows) {
                config[item.config_name] = item.config_contant;
            }
            db.query(`update collection_user set default_avatar = '${config.default_avatar?config.default_avatar:""}' where username = '${verify_token(token).username}'`).then(data => {
                res.send(new result((config.default_avatar ? config.default_avatar : ""), "success", 200));
            }).catch(err => {
                res.send(err);
            })
        }).catch(err => {
            res.send(err);
        })
    } else {
        db.query(`update collection_user set default_avatar = '${req.file.originalname}' where username = '${verify_token(token).username}'`).then(data => {
            res.send(new result("修改头像成功", "success", 200));
        }).catch(err => {
            res.send(err);
        })
    }
});

//修改图集大类封面
router.post('/modify/cover', upload.single('imgfile'), (req, res, next) => {
    const param = req.body;
    const token = req.headers.authorization.split("Bearer")[1].trim();
    if (!req.file) {
        //未上传图片文件 使用默认头像
        db.query(`select * from collection_config`).then(data => {
            let config = {};
            for (let item of data.rows) {
                config[item.config_name] = item.config_contant;
            }
            db.query(`update collection_user set gallery_img = '${config.default_gallery_cover?config.default_gallery_cover:""}' where username = '${verify_token(token).username}'`).then(data => {
                res.send(new result((config.default_gallery_cover ? config.default_gallery_cover : ""), "success", 200));
            }).catch(err => {
                res.send(err);
            })
        }).catch(err => {
            res.send(err);
        })
    } else {
        db.query(`update collection_user set gallery_img = '${req.file.originalname}' where username = '${verify_token(token).username}'`).then(data => {
            res.send(new result("修改封面成功", "success", 200));
        }).catch(err => {
            res.send(err);
        })
    }
});

//修改图集小类封面
router.post('/modify/cover/item', upload.single('imgfile'), (req, res, next) => {
    const param = req.body;
    const token = req.headers.authorization.split("Bearer")[1].trim();
    if (!req.file) {
        //未上传图片文件 使用默认头像
        db.query(`select * from collection_config`).then(data => {
            let config = {};
            for (let item of data.rows) {
                config[item.config_name] = item.config_contant;
            }
            db.query(`update collection_user set gallery_item_img = '${config.default_gallery_item_cover?config.default_gallery_item_cover:""}' where username = '${verify_token(token).username}'`).then(data => {
                res.send(new result((config.default_gallery_cover ? config.default_gallery_cover : ""), "success", 200));
            }).catch(err => {
                res.send(err);
            })
        }).catch(err => {
            res.send(err);
        })
    } else {
        db.query(`update collection_user set gallery_item_img = '${req.file.originalname}' where username = '${verify_token(token).username}'`).then(data => {
            res.send(new result("修改封面成功", "success", 200));
        }).catch(err => {
            res.send(err);
        })
    }
});

//获取项目总览信息
router.get('/project/info', (req, res, next) => {
    //
    let query1 = db.query(`SELECT COUNT(*) AS gallery_count FROM collection_gallery WHERE gallery_del_flag = 1`)
    let query2 = db.query(`SELECT COUNT(*) AS gallery_item_count FROM collection_gallery_item WHERE gallery_item_del_flag = 1`)
    let query3 = db.query(`SELECT COUNT(*) AS img_total_count,SUM(img_size) AS img_total_size FROM collection_img`)
    Promise.all([query1, query2, query3]).then((data) => {
        res.send(new result({
            gallery_count: data[0].rows[0].gallery_count || 0,
            gallery_item_count: data[1].rows[0].gallery_item_count || 0,
            img_total_count: data[2].rows[0].img_total_count || 0,
            img_total_size: data[2].rows[0].img_total_size || 0,
        }, 'success', 200))
    }).catch((err) => {
        res.send(new result(null, err, 500))
    })
});


module.exports = router;
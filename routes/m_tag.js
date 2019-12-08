var express = require('express');
var bodyParser = require('body-parser')
var multer = require('multer');
var fs = require('fs');
var path = require('path');
var moment = require('moment');
var uuid = require('node-uuid');

var router = express.Router();

const db = require('../config/db');
const fileType = ['image/jpeg', 'image/pjpeg', 'image/gif', 'image/png', 'image/x-png']
let result = require('../config/result'); //返回数据统一model


var createFolder = function (folder) {
    try {
        fs.accessSync(folder);
    } catch (e) {
        fs.mkdirSync(folder);
    }
};
var uploadFolder = './wgyblog_upload/';

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

router.post('/all', (req, res, next) => {
    const param = req.body;
    let query1 = db.query(`SELECT COUNT(*) AS count
    FROM blog_tag
    WHERE status = 1 
    and name Like '%${param.queryName}%'`)
    let query2 = db.query(`SELECT *
    FROM blog_tag
    WHERE status = 1 
    and name Like '%${param.queryName}%'
    LIMIT ${param.pageSize*(param.currentPage-1)},${param.pageSize}`)
    Promise.all([query1, query2]).then((data) => {
        res.send(new result({
            total: data[0].rows[0].count || 0,
            rows: data[1].rows || []
        }, 'success', 200))
    }).catch((err) => {
        res.send(new result(null, err, 500))
    })
});

router.post('/add', (req, res, next) => {
    const param = req.body;
    let id = uuid.v1()
    db.query(`INSERT INTO blog_tag VALUES ('${id}','${param.name}','${param.remark}',1)`).then((data) => {
        res.send(new result(null, "新增成功", 200));
    }).catch(err => {
        console.log(err)
        res.send(new result(null, "新增失败", 500));
    })
});

router.post('/delete', (req, res, next) => {
    const param = req.body;
    let categoryLists = param.categoryLists
    let _sql = []
    for(let item of categoryLists){
        _sql.push(`id='${item}'`)
    }
    db.query(`UPDATE blog_tag SET status = 2 WHERE (${_sql.join(" or ")})`).then((data) => {
        res.send(new result(null, "删除成功", 200));
    }).catch(err => {
        console.log(err)
        res.send(new result(null, "删除失败", 500));
    })
});

router.post('/update', (req, res, next) => {
    const param = req.body;
    db.query(`UPDATE blog_tag SET name = '${param.name}',remark='${param.remark}' WHERE id = '${param.id}'`).then((data) => {
        res.send(new result(null, "修改成功", 200));
    }).catch(err => {
        console.log(err)
        res.send(new result(null, "修改失败", 500));
    })
});


module.exports = router;
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
    FROM blog_category
    WHERE status = 1 
    and name Like '%${param.queryName}%'`)
    let query2 = null
    if (param.currentPage === -1) {
        //查询所有分类
        query2 = db.query(`SELECT *
    FROM blog_category
    WHERE status = 1 
    and name Like '%${param.queryName}%'`)
    } else {
        query2 = db.query(`SELECT a.*,COUNT(article_id) AS article_count
    FROM blog_category a LEFT JOIN blog_article_category b
    ON a.id = b.category_id
    WHERE a.status = 1 
    and a.name Like '%${param.queryName}%'
    GROUP BY a.name
    LIMIT ${param.pageSize*(param.currentPage-1)},${param.pageSize}`)
    }
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
    db.query(`select * from blog_category WHERE name='${param.name}'`).then(data => {
        if(data.rows.length > 0){
            res.send(new result(null, "该类别已存在!", 500));
        }else{
            db.query(`INSERT INTO blog_category VALUES ('${id}','${param.name}','${param.remark}',1,2)`).then((data) => {
                res.send(new result(null, "新增成功", 200));
            }).catch(err => {
                console.log(err)
                res.send(new result(null, "新增失败", 500));
            })
        }
    })
});

router.post('/delete', (req, res, next) => {
    const param = req.body;
    let categoryLists = param.categoryLists
    let _sql = []
    let _sql2 = []
    for (let item of categoryLists) {
        _sql.push(`id='${item}'`)
        _sql2.push(`category_id='${item}'`)
    }
    if(!categoryLists||categoryLists.length === 0){
        res.send(new result(null, "未选择类别删除", 500));
    }else{
        db.query(`UPDATE blog_category SET status = 2 WHERE (${_sql.join(" or ")})`).then((data) => {
            //把对应文章分类改为默认
            db.query(`DELETE FROM blog_article_category WHERE (${_sql2.join(" or ")})`).then(data2=>{
                res.send(new result(null, "删除成功", 200));
            }).catch(err => {
                console.log(err)
                res.send(new result(null, "删除失败", 500));
            })
        }).catch(err => {
            console.log(err)
            res.send(new result(null, "删除失败", 500));
        })
    }
});

router.post('/update', (req, res, next) => {
    const param = req.body;
    db.query(`UPDATE blog_category SET name = '${param.name}',remark='${param.remark}' WHERE id = '${param.id}'`).then((data) => {
        res.send(new result(null, "修改成功", 200));
    }).catch(err => {
        console.log(err)
        res.send(new result(null, "修改失败", 500));
    })
});


module.exports = router;
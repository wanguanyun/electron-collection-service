var express = require('express');
var bodyParser = require('body-parser')
var multer = require('multer');
var fs = require('fs');
var path = require('path');
var moment = require('moment');
var uuid = require('node-uuid');
const {
    secretKey,
    pw_hash,
    generate_token,
    verify_token
} = require('../config/jwt');

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

//文章查询
router.post('/all', (req, res, next) => {
    const param = req.body;
    //文章搜索
    const queryName = param.queryName;
    const currentPage = param.currentPage;
    const pageSize = param.pageSize;
    const status = param.status;
    const release_date = param.release_date;
    let dateQuery_sql = ''
    if (release_date) {
        let stTime = parseInt(release_date) * 1000000 + 10000
        let edTime = parseInt(release_date) * 1000000 + 312359
        dateQuery_sql = `AND release_date<${edTime} AND release_date>${stTime}`
    }
    const category = param.category;
    let categoryQuery_sql = ''
    if(category){
        categoryQuery_sql = `WHERE c.category_id  LIKE "%${category}%"`
    }else{
        categoryQuery_sql = `WHERE (c.category_id  LIKE "%${category}%" OR c.category_id IS NULL)`
    }
    let query1 = db.query(`SELECT COUNT(*) AS count FROM (SELECT a.*,GROUP_CONCAT(DISTINCT(b.category_id)) AS category_id
    FROM blog_article AS a 
        LEFT JOIN blog_article_category AS b ON a.id = b.article_id
        WHERE a.title LIKE "%${queryName}%" 
        ${status?('AND a.status ='+status):'AND a.status <> 3'}
        ${dateQuery_sql} GROUP BY a.id) AS c 
        ${categoryQuery_sql}`)
    //查询所有状态的
    let query2 = db.query(`SELECT * FROM (SELECT a.id,a.title,a.author,a.tag,a.release_date,a.status,
        a.if_front,a.cover_img,a.summary,a.if_allow_comment,GROUP_CONCAT(DISTINCT(b.category_id)) AS category_id,
        GROUP_CONCAT(DISTINCT(b.name)) AS category FROM blog_article AS a 
        LEFT JOIN (SELECT aa.*,bb.name FROM blog_article_category AS aa LEFT JOIN blog_category AS bb ON aa.category_id = bb.id) AS b ON a.id = b.article_id
        WHERE a.title LIKE "%${queryName}%" 
        ${status?('AND a.status ='+status):'AND a.status <> 3'}
        ${dateQuery_sql} GROUP BY a.id) AS c
        ${categoryQuery_sql} ORDER BY c.release_date DESC LIMIT ${pageSize*(currentPage-1)},${pageSize}`)
    Promise.all([query1, query2]).then((data) => {
        res.send(new result({
            total: data[0].rows[0].count || 0,
            rows: data[1].rows || []
        }, 'success', 200))
    }).catch((err) => {
        res.send(new result(null, err, 500))
    })
})

//文章详情查询
router.post('/info', (req, res, next) => {
    const param = req.body;
    let query1 = db.query(`SELECT a.id AS id,a.title AS title,a.content AS content,a.tag AS tag,a.status AS status,a.if_front AS if_front,a.cover_img AS cover_img,
    a.summary AS summary,a.if_allow_comment AS if_allow_comment, b.id AS img_id,b.name AS name,b.net_url AS net_url,b.file_type AS file_type
     FROM blog_article AS a LEFT JOIN blog_img AS b ON a.cover_img=b.id WHERE a.id = ${param.id}`)
    let query2 = db.query(`SELECT * FROM blog_article_category AS a LEFT JOIN blog_category AS b ON a.category_id=b.id WHERE a.article_id=${param.id}`)
    Promise.all([query1, query2]).then((data) => {
        res.send(new result({
            info: data[0].rows && data[0].rows.length?data[0].rows[0]:null,
            category: data[1].rows || []
        }, 'success', 200))
    }).catch((err) => {
        res.send(new result(null, err, 500))
    })
})

router.post('/delete', (req, res, next) => {
    const param = req.body;
    let articleLists = param.articleLists
    let _sql = []
    let _sql2 = []
    for (let item of articleLists) {
        _sql.push(`id='${item}'`)
        _sql2.push(`article_id='${item}'`)
    }
    if(!articleLists||articleLists.length === 0){
        res.send(new result(null, "未选择文章删除", 500));
    }else{
        db.query(`UPDATE blog_article SET status = 3 WHERE (${_sql.join(" or ")})`).then((data) => {
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

router.get('/statistics', (req, res, next) => {
    db.query(`SELECT SUM(CASE WHEN STATUS IN (1,2) THEN 1 ELSE 0 END) AS all_count,SUM(CASE WHEN STATUS=1 THEN 1 ELSE 0 END) AS draft_count,
    SUM(CASE WHEN STATUS=2 THEN 1 ELSE 0 END) AS post_count,SUM(CASE WHEN STATUS=3 THEN 1 ELSE 0 END) AS recyle_count FROM blog_article`).then(data => {
        if(data.rows && data.rows.length === 1){
            res.send(new result(data.rows[0], "success", 200));
        }else{
            res.send(new result(null, "查询文章统计失败", 500));
        }
    }).catch(err => {
        res.send(new result(null, "查询文章统计失败", 500));
    })
})

//文章新增
router.post('/add', (req, res, next) => {
    const param = req.body;
    const token = req.headers.authorization.split("Bearer")[1].trim()
    const title = param.title ? param.title : '';
    const content = param.content.replace(/\'/g, '\'\'').replace(/\\/g, "&#92;");
    const author = verify_token(token).username;
    const category = param.category ? param.category : [];
    const tag = param.tag ? param.tag : '';
    const release_date = moment().format('YYYYMMDDHHmm')
    const status = param.status ? param.status : 1;
    const if_front = param.if_front ? param.if_front : 2;
    const cover_img = param.cover_img ? param.cover_img : '';
    const if_allow_comment = param.if_allow_comment ? param.if_allow_comment : 2;
    let summary = ''
    //摘要
    if (param.summary) {
        summary = param.summary.replace(/\'/g, '\'\'').replace(/\\/g, "&#92;");
    } else {
        //param.content
        summary = param.content.replace(/\n[\s]*/g, '').replace(/<code.*?code>/g, '').replace(/<[^<>]*>/g, '').substr(0, 300) + "..."
        summary = summary.replace(/\'/g, '\'\'').replace(/\\/g, "&#92;");
    }
    if(param.id) {
        //更新状态
        db.query(`UPDATE blog_article SET title='${title}',content='${content}',author='${author}',tag='${tag}',release_date=${release_date},
        status=${status},if_front=${if_front},cover_img='${cover_img}',summary='${summary}',if_allow_comment=${if_allow_comment} 
        WHERE id=${param.id}`).then(data => {
        //修改类别关联表
        db.query(`DELETE FROM blog_article_category WHERE article_id = ${param.id}`).then(()=>{
            db.query(`INSERT INTO blog_article_category VALUES ${category.map(item => {
                return "('"+param.id+"','"+item+"')"
            }).join(",")}`).then(data2 => {
                res.send(new result(null, "更新成功", 200));
            }).catch(err => {
                res.send(new result(null, "更新失败", 500));
            })
        }).catch(()=>{
            res.send(new result(null, "更新类别失败", 500));
        })
    }).catch(err => {
        console.log(err)
        res.send(new result(null, "更新失败", 500));
    })
    }else{
        db.query(`INSERT INTO blog_article VALUES (NULL,'${title}','${content}','${author}','${tag}',${release_date},${status},
    ${if_front},'${cover_img}','${summary}',${if_allow_comment},'')`).then(data => {
        //新增类别关联表
        db.query(`INSERT INTO blog_article_category VALUES ${category.map(item => {
            return "('"+data.rows.insertId+"','"+item+"')"
        }).join(",")}`).then(data2 => {
            res.send(new result(null, "新增成功", 200));
        }).catch(err => {
            res.send(new result(null, "新增失败", 500));
        })
    }).catch(err => {
        console.log(err)
        res.send(new result(null, "新增失败", 500));
    })
    }
});


module.exports = router;
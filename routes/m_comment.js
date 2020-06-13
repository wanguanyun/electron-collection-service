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

//提交用户评论
router.post('/add', (req, res, next) => {
  const param = req.body;
  db.query(`select * from blog_article where id = ${param.article_id} and status = 2`).then((data) => {
    let articleInfo = data.rows[0]
    const release_date = moment().format('YYYY-MM-DD HH:mm')
    const commentId = uuid.v1()
    const articleId = articleInfo.id
    if (articleInfo.if_allow_comment === 1) {
      if (articleInfo.if_approval_comment === 2) {
        //不需要审核评论
        db.query(`INSERT INTO blog_comment VALUES('${commentId}',${articleId},'${param.userComment.name}','${param.userComment.email}',
        '${param.userComment.website}','${param.userComment.context}','${release_date}', '${param.commentInfo && param.commentInfo.parent_id ? param.commentInfo.parent_id : ''}','${param.commentInfo && param.commentInfo.parent_name ? param.commentInfo.parent_name : ''}',1)`).then(data2 => {
          res.send(new result(null, "评论成功", 200));
        }).catch(err => {
          res.send(new result(null, "评论失败了", 500))
        })
      } else {
        //需要审核
        db.query(`INSERT INTO blog_comment VALUES('${commentId}',${articleId},'${param.userComment.name}','${param.userComment.email}',
        '${param.userComment.website}','${param.userComment.context}','${release_date}', '${param.commentInfo && param.commentInfo.parent_id ? param.commentInfo.parent_id : ''}','${param.commentInfo && param.commentInfo.parent_name ? param.commentInfo.parent_name : ''}',2)`).then(data2 => {
          res.send(new result(null, "评论成功，等待管理员审核", 200));
        }).catch(err => {
          res.send(new result(null, "评论失败了", 500))
        })
      }
    } else {
      res.send(new result(null, "文章未开启评论", 500))
    }
  })
    .catch((err) => {
      res.send(new result(null, "评论失败了", 500))
    })
})


//文章用户评论列表
//伪分页
router.post('/list', (req, res, next) => {
  const param = req.body;
  const pagination = param.pagination
  db.query(`select * from blog_comment where article_id = ${param.articleId} and status = 1`).then(data => {
    //转化成树结构 不使用递归多层children 只到二级 便于展示
    let rootNode = data.rows.filter(item => !item.parent_id).map(item2 => {
      item2.children = []
      return item2
    })
    for (let item of rootNode) {
      for (let itemInner of data.rows) {
        if (item.comment_id === itemInner.parent_id) {
          item.children = item.children.concat(itemInner)
        }
      }
      //二级评论时间需要按照时间从小到大排序
      item.children.sort((a, b) => {
        return parseInt(moment(a.comment_date, 'YYYY-MM-DD HH:mm').format("YYYYMMDDHHmm")) - parseInt(moment(b.comment_date, 'YYYY-MM-DD HH:mm').format("YYYYMMDDHHmm"))
      })
    }
    //一级评论需要按照时间从大到小排序
    res.send(new result({
      rows: rootNode.sort((a, b) => {
        return parseInt(moment(b.comment_date, 'YYYY-MM-DD HH:mm').format("YYYYMMDDHHmm")) - parseInt(moment(a.comment_date, 'YYYY-MM-DD HH:mm').format("YYYYMMDDHHmm"))
      }).slice((pagination.pageNum-1)*pagination.pageSize, pagination.pageNum*pagination.pageSize),
      //一级评论条数 分页用
      totalLevel1: rootNode.length,
      //总评论条数
      total: data.rows.length,
    }, 'success', 200))
  }).catch(err => {
    res.send(new result(null, "获取评论列表失败", 500))
  })
})


module.exports = router;
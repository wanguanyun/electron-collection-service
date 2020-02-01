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

router.get('/:imgname', function (req, res) {
    //第二个参数 highWaterMark 最高水位线,默认最多读取10M(1:64K)
    const stream = fs.createReadStream(uploadFolder + req.params.imgname, {
        highWaterMark: 160
    }); //获取图片的文件名
    var responseData = []; //存储文件流
    if (stream) { //判断状态
        stream.on('data', function (chunk) {
            responseData.push(chunk);
        });
        stream.on('end', function () {
            var finalData = Buffer.concat(responseData);
            res.write(finalData);
            res.end();
        });
    }
    // 监听错误
    stream.on('error', function (err) {
        res.send(new result(null, '图片去哪儿了？', 404))
    })
})

//图片上传
router.post('/upload', upload.single('myfile'), (req, res, next) => {
    console.log(req.file)
    //校验文件后缀只能是图片
    if (!fileType.includes(req.file.mimetype)) {
        res.send(new result(null, "只能传小姐姐图片!", 500));
        return
    }
    var fileId = uuid.v1()
    const fileName = req.file.filename
    const fileSize = req.file.size
    const nowTime = moment().format('YYYYMMDDHHmm')
    db.query(`INSERT INTO collection_img VALUES ('${fileName}','${fileId}','',${nowTime},${fileSize})`).then(data => {
        res.send(new result({
                        fileId,
                        fileName,
                        fileSize,
                        nowTime
                    }, "success", 200));
    }).catch(err => {
        res.send(null, "小姐姐上传失败！", 500);
    })
});


module.exports = router;
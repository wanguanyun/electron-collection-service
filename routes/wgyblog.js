var express = require('express');
var bodyParser = require('body-parser')
var request = require("request");
var multer = require('multer');
var fs = require('fs');
var jwt = require('jsonwebtoken'); // 使用jwt签名
var bcrypt = require('bcryptjs'); //数据加密
var path = require('path');
var moment = require('moment');
var uuid = require('node-uuid');

var router = express.Router();
const fileType = ['image/jpeg', 'image/pjpeg', 'image/gif', 'image/png', 'image/x-png']
const fileTypeSimple = ['jpg','jepg','gif','png','bmp']
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
var uploadFolder = './wgyblog_upload/';

createFolder(uploadFolder);

// 通过 filename 属性定制
var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadFolder); // 保存的路径，备注：需要自己创建
    },
    filename: function (req, file, cb) {
        // 将保存文件名设置为 字段名 + 时间戳，比如 logo-1478521468943
        let suffx = file.originalname.split(".")[file.originalname.split(".").length - 1]
        let fileName = uuid.v1()
        let temp = file.originalname.split(".")
        temp.pop()
        temp.push(Date.now(), suffx)
        // cb(null, temp.join("."));
        cb(null, `${fileName}.${suffx}`);
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
            cb(new Error('上传文件类型错误!'))
        }
    },
    //限制文件上传2M内
    limits: {
        fileSize: 2 * 1024 * 1024
    }
})

router.get('/img/:imgname', function (req, res) {
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
router.post('/upload', upload.single('myImg'), (req, res, next) => {
    console.log(req.file)
    //校验文件后缀只能是图片
    let fileType = req.file.mimetype
    if (!fileType.includes(req.file.mimetype)) {
        res.send(new result(null, "上传文件类型错误", 500));
        return
    }
    const token = req.headers.authorization.split("Bearer")[1].trim()
    var fileId = uuid.v1()
    const fileName = req.file.filename
    const fileSize = req.file.size
    const nowTime = moment().format('YYYYMMDDHHmm')
    db.query(`INSERT INTO blog_img VALUES ('${fileId}','${fileType}','${nowTime}','${fileName}',${fileSize},'${verify_token(token).username}','',1,'local','')`).then(data => {
        res.send(new result({
                        id:fileId,
                        upload_user:verify_token(token).username,
                        fileName,
                        fileType,
                        fileSize,
                        upload_time:nowTime
                    }, "success", 200));
    }).catch(err => {
        res.send(null, "小姐姐上传失败！", 500);
    })
});

//图片上传
router.post('/upload/net', (req, res, next) => {
    let url = req.body.url
    if(url && /^((https|http|ftp|rtsp|mms)?:\/\/)[^\s]+/g.test(url) && fileTypeSimple.includes(url.split('.')[url.split('.').length-1])){
        //校验url是不是图片地址
        //开始写入图片
        const name = url.split("/")[url.split("/").length - 1]
        new Promise( (reslove,reject) => {
            let writeStream = request(url)
            writeStream.pipe(fs.createWriteStream(`${uploadFolder}/${name}`))
            writeStream.on('error',function(err){
                writeStream.end();
                reject()
            })
            writeStream.on('end', function (response) {
                writeStream.end();
                reslove()
            });
        }).then(()=>{
            const token = req.headers.authorization.split("Bearer")[1].trim()
            var fileId = uuid.v1()
            const nowTime = moment().format('YYYYMMDDHHmm')
            db.query(`INSERT INTO blog_img VALUES ('${fileId}','','${nowTime}','${name}',null,'${verify_token(token).username}','',1,'net','${url}')`).then(data => {
                res.send(new result({
                    id:fileId,
                    upload_user:verify_token(token).username,
                    fileName:name,
                    fileType:'',
                    fileSize:null,
                    upload_time:nowTime
                }, "success", 200));
            })
        }).catch(err=>{
            res.send(new result(null, "网络图片写入失败", 500));
        })
    
    }else{
        res.send(new result(null, "网络图片地址解析失败", 500));
    }
});


//图片上传多个图片
router.post('/uploads', upload.array('myImgs', 5), (req, res, next) => {
    console.log(req.files)
    const token = req.headers.authorization.split("Bearer")[1].trim()
    //校验文件后缀只能是图片
    let successUploadImgList = []
    let serialFn = async () => {
        for (let item of req.files) {
            if (fileType.includes(item.mimetype)) {
                //只上传符合条件的图片
                let fileId = uuid.v1()
                let fileName = item.filename
                let fileSize = item.size
                let fileType = item.mimetype
                const nowTime = moment().format('YYYYMMDDHHmm')
                await db.query(`INSERT INTO blog_img VALUES ('${fileId}','${fileType}','${nowTime}','${fileName}',${fileSize},'${verify_token(token).username}','',1,'local','')`).then(res => {
                    successUploadImgList.push({
                        id:fileId,
                        upload_user:verify_token(token).username,
                        fileName,
                        fileType,
                        fileSize,
                        upload_time:nowTime
                    })
                })
            }
        }
        //返回上传成功的图片名称列表
        res.send(new result({successUploadImgList}, "success", 200));
    }
    serialFn()
});

router.post('/img/batchdelete', (req, res, next) => {
    const param = req.body;
    let selectedImgLists = param.selectedImgLists
    let _sql = []
    for(let item of selectedImgLists){
        _sql.push(`name='${item}'`)
    }
    db.query(`UPDATE blog_img SET status = 2 WHERE (${_sql.join(" or ")})`)
    for(let item of selectedImgLists){
        if(fs.existsSync(`${uploadFolder}/${item}`)) {
            //判断文件是否存在
            fs.unlink(`${uploadFolder}/${item}`,function(error){
                if(error){
                    console.log(error);
                    return false;
                }
                console.log('删除文件成功');
            })
        }
    }
    res.send(new result(null, "操作成功", 200));
});

//读取博客配置
router.get('/config', (req, res, next) => {
    db.query(`select * from blog_config`).then(data => {
        let config = {};
        for (let item of data.rows) {
          config[item.config_name] = item.config_contant;
        }
        res.send(new result(config, "success", 200));
    })
});

module.exports = router;
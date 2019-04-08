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

/*获取图集大类详情*/
router.post('/info', (req, res, next) => {
    const param = req.body;
    console.log(req.body)
    db.query(`SELECT *
        FROM collection_gallery
        WHERE gallery_id= '${param.galleryId}'`).then((data) => {
        res.send(new result(
            data.rows[0] || {}, 'success', 200))
    }).catch((err) => {
        res.send(new result(null, err, 500))
    })
});

/*获取图集大类查询列表*/
router.post('/main', (req, res, next) => {
    const param = req.body;
    console.log(req.body)
    let desc_label = ''
    if (param.querysort == '1') {
        desc_label = 'ORDER BY CONVERT(a.gallery_name USING gbk) DESC'
    } else if (param.querysort == '2') {
        desc_label = 'ORDER BY a.gallery_rank DESC'
    } else if (param.querysort == '3') {
        desc_label = 'ORDER BY a.create_time DESC'
    }
    let query1 = db.query(`SELECT COUNT(*) AS count
        FROM collection_gallery a LEFT JOIN collection_img b ON a.gallery_cover = b.img_id 
        WHERE a.gallery_del_flag = 1 AND (a.gallery_name LIKE '%${param.queryname}%' OR a.gallery_tag LIKE '%${param.queryname}%') 
        AND a.gallery_type = ${param.gallerytype}
        ${desc_label}`)
    let query2 = db.query(`SELECT *,
        (SELECT COUNT(*) FROM collection_gallery_item WHERE gallery_id = a.gallery_id AND gallery_item_del_flag = 1) AS gallery_item_count,
        (SELECT GROUP_CONCAT(gallery_item_name) FROM collection_gallery_item WHERE gallery_id = a.gallery_id AND gallery_item_del_flag = 1) AS gallery_item_names
        FROM collection_gallery a LEFT JOIN collection_img b ON a.gallery_cover = b.img_id 
        WHERE a.gallery_del_flag = 1 AND (a.gallery_name LIKE '%${param.queryname}%' OR a.gallery_tag LIKE '%${param.queryname}%') 
        AND a.gallery_type = ${param.gallerytype}
        ${desc_label}
        LIMIT ${param.pagesize*(param.currentpage-1)},${param.pagesize}`)
    Promise.all([query1, query2]).then((data) => {
        res.send(new result({
            total: data[0].rows[0].count || 0,
            rows: data[1].rows || []
        }, 'success', 200))
    }).catch((err) => {
        res.send(new result(null, err, 500))
    })
});

/*获取图集小类查询列表*/
router.post('/main/items', (req, res, next) => {
    const param = req.body;
    console.log(req.body)
    let desc_label = ''
    if (param.querysort == '1') {
        desc_label = 'ORDER BY CONVERT(a.gallery_item_name USING gbk) DESC'
    } else if (param.querysort == '2') {
        desc_label = 'ORDER BY a.gallery_item_rank DESC'
    } else if (param.querysort == '3') {
        desc_label = 'ORDER BY a.create_time DESC'
    }
    let query1 = db.query(`SELECT COUNT(*) AS count
        FROM collection_gallery_item a LEFT JOIN collection_img b ON a.gallery_item_cover = b.img_id 
        WHERE a.gallery_id = '${param.galleryId}' AND a.gallery_item_del_flag = 1 AND (a.gallery_item_name LIKE '%${param.queryname}%' OR a.gallery_item_tag LIKE '%${param.queryname}%') 
        ${desc_label}`)
    let query2 = db.query(`SELECT *
        FROM collection_gallery_item a LEFT JOIN collection_img b ON a.gallery_item_cover = b.img_id 
        WHERE a.gallery_id = '${param.galleryId}' AND a.gallery_item_del_flag = 1 AND (a.gallery_item_name LIKE '%${param.queryname}%' OR a.gallery_item_tag LIKE '%${param.queryname}%') 
        ${desc_label}
        LIMIT ${param.pagesize*(param.currentpage-1)},${param.pagesize}`)
    Promise.all([query1, query2]).then((data) => {
        res.send(new result({
            total: data[0].rows[0].count || 0,
            rows: data[1].rows || []
        }, 'success', 200))
    }).catch((err) => {
        res.send(new result(null, err, 500))
    })
});

/*图集大类新增*/
router.post('/add', upload.single('imgfile'), (req, res, next) => {
    const param = req.body;
    console.log(req.body)
    const fileId = uuid.v1()
    const galleryId = uuid.v1()
    const nowTime = moment().format('YYYYMMDDHHmm')
    if (!req.file) {
        //未上传图片文件 使用默认封面 ->fileId不传
        db.query(`INSERT INTO collection_gallery VALUES('${galleryId}','${param.title}','','${param.tags}',
        '${nowTime}','',${param.type},'${param.netAddress}','${param.localAddress}',${param.rank},1)`).then(data2 => {
            res.send(new result("新增成功", "success", 200));
        }).catch(err => {
            res.send(new result(null, "新增小姐姐失败！", 500));
        })
    } else {
        //1、上传图片
        //2、新增记录
        if (!fileType.includes(req.file.mimetype)) {
            res.send(new result(null, "只能传小姐姐图片!", 500));
            return
        }
        const fileName = req.file.filename
        const fileSize = req.file.size
        db.query(`INSERT INTO collection_img VALUES ('${fileName}','${fileId}','',${nowTime},${fileSize})`).then(data => {
            db.query(`INSERT INTO collection_gallery VALUES('${galleryId}','${param.title}','${fileId}','${param.tags}',
        '${nowTime}','',${param.type},'${param.netAddress}','${param.localAddress}',${param.rank},1)`).then(data2 => {
                res.send(new result("新增成功", "success", 200));
            }).catch(err => {
                res.send(new result(null, "新增小姐姐失败！", 500));
            })
        }).catch(err => {
            res.send(new result(null, "小姐姐上传失败！", 500));
        })
    }
});

/*图集小类类新增*/
router.post('/add/item', upload.single('imgfile'), (req, res, next) => {
    const param = req.body;
    console.log(req.body)
    const fileId = uuid.v1()
    const galleryItemId = uuid.v1()
    const nowTime = moment().format('YYYYMMDDHHmm')
    if (!req.file) {
        //未上传图片文件 使用默认封面 ->fileId不传
        db.query(`INSERT INTO collection_gallery_item VALUES('${param.galleryId}','${galleryItemId}','${param.tags}','${param.title}','',
        '','${param.netAddress}','${param.localAddress}','${nowTime}',${param.rank},1)`).then(data2 => {
            res.send(new result("新增成功", "success", 200));
            //同步标签给大类
            db.query(`SELECT GROUP_CONCAT(gallery_item_tag) as gallery_item_tags FROM collection_gallery_item WHERE gallery_id= '${param.galleryId}' AND gallery_item_del_flag = 1`).then((res) => {
                let tags = res.rows[0].gallery_item_tags ? res.rows[0].gallery_item_tags : ''
                let dataSet = new Set()
                let data_arr = []
                tags.split(",").forEach(item => {
                    dataSet.add(item)
                })
                for (let item of dataSet) {
                    data_arr.push(item)
                }
                db.query(`UPDATE collection_gallery SET gallery_tag = '${data_arr.join(",")}' WHERE gallery_id= '${param.galleryId}'`)
                    .then((res) => {}).catch(err => {})
            }).catch(err => {})
        }).catch(err => {
            res.send(new result(null, "新增小姐姐失败！", 500));
        })
    } else {
        //1、上传图片
        //2、新增记录
        if (!fileType.includes(req.file.mimetype)) {
            res.send(new result(null, "只能传小姐姐图片!", 500));
            return
        }
        const fileName = req.file.filename
        const fileSize = req.file.size
        db.query(`INSERT INTO collection_img VALUES ('${fileName}','${fileId}','',${nowTime},${fileSize})`).then(data => {
            db.query(`INSERT INTO collection_gallery_item VALUES('${param.galleryId}','${galleryItemId}','${param.tags}','${param.title}','',
        '${fileId}','${param.netAddress}','${param.localAddress}','${nowTime}',${param.rank},1)`).then(data2 => {
                res.send(new result("新增成功", "success", 200));
                //同步标签给大类
                db.query(`SELECT GROUP_CONCAT(gallery_item_tag) as gallery_item_tags FROM collection_gallery_item WHERE gallery_id= '${param.galleryId}' AND gallery_item_del_flag = 1`).then((res) => {
                    let tags = res.rows[0].gallery_item_tags ? res.rows[0].gallery_item_tags : ''
                    let dataSet = new Set()
                    let data_arr = []
                    tags.split(",").forEach(item => {
                        dataSet.add(item)
                    })
                    for (let item of dataSet) {
                        data_arr.push(item)
                    }
                    db.query(`UPDATE collection_gallery SET gallery_tag = '${data_arr.join(",")}' WHERE gallery_id= '${param.galleryId}'`)
                        .then((res) => {}).catch(err => {})
                }).catch(err => {})
            }).catch(err => {
                res.send(new result(null, "新增小姐姐失败！", 500));
            })
        }).catch(err => {
            res.send(new result(null, "小姐姐上传失败！", 500));
        })
    }
});

/*图集大类修改*/
router.post('/update', upload.single('imgfile'), (req, res, next) => {
    const param = req.body;
    console.log(req.body)
    const fileId = uuid.v1()
    const nowTime = moment().format('YYYYMMDDHHmm')
    if (!req.file) {
        //未上传图片文件 使用封面
        db.query(`UPDATE collection_gallery SET gallery_name = '${param.title}',gallery_cover = '${param.imgId}',
        gallery_tag='${param.tags}',create_time=${nowTime},gallery_type=${param.type},gallery_net='${param.netAddress}',
        gallery_local='${param.localAddress}',gallery_rank=${param.rank} WHERE gallery_id='${param.galleryId}'`)
            .then(data2 => {
                res.send(new result("修改成功", "success", 200));
            }).catch(err => {
                res.send(new result(null, "修改小姐姐失败！", 500));
            })
    } else {
        //1、上传图片
        //2、修改记录
        if (!fileType.includes(req.file.mimetype)) {
            res.send(new result(null, "只能传小姐姐图片!", 500));
            return
        }
        const fileName = req.file.filename
        const fileSize = req.file.size
        db.query(`INSERT INTO collection_img VALUES ('${fileName}','${fileId}','',${nowTime},${fileSize})`).then(data => {
            db.query(`UPDATE collection_gallery SET gallery_name = '${param.title}',gallery_cover = '${fileId}',
        gallery_tag='${param.tags}',create_time=${nowTime},gallery_type=${param.type},gallery_net='${param.netAddress}',
        gallery_local='${param.localAddress}',gallery_rank=${param.rank} WHERE gallery_id='${param.galleryId}'`).then(data2 => {
                res.send(new result("修改成功", "success", 200));
            }).catch(err => {
                res.send(new result(null, "修改小姐姐失败！", 500));
            })
        }).catch(err => {
            res.send(new result(null, "小姐姐上传失败！", 500));
        })
    }
});

/*图集小类修改*/
router.post('/update/item', upload.single('imgfile'), (req, res, next) => {
    const param = req.body;
    console.log(req.body)
    const fileId = uuid.v1()
    const nowTime = moment().format('YYYYMMDDHHmm')
    if (!req.file) {
        //未上传图片文件 使用封面
        db.query(`UPDATE collection_gallery_item SET gallery_item_name = '${param.title}',gallery_item_cover = '${param.imgId}',
        gallery_item_tag='${param.tags}',create_time=${nowTime},gallery_item_net='${param.netAddress}',
        gallery_item_local='${param.localAddress}',gallery_item_rank=${param.rank} WHERE gallery_item_id='${param.galleryItemId}'`)
            .then(data2 => {
                res.send(new result("修改成功", "success", 200));
                //同步标签给大类
                db.query(`SELECT GROUP_CONCAT(gallery_item_tag) as gallery_item_tags FROM collection_gallery_item WHERE gallery_id= '${param.galleryId}' AND gallery_item_del_flag = 1`).then((res) => {
                    console.log(res)
                    let tags = res.rows[0].gallery_item_tags ? res.rows[0].gallery_item_tags : ''
                    let dataSet = new Set()
                    let data_arr = []
                    tags.split(",").forEach(item => {
                        dataSet.add(item)
                    })
                    for (let item of dataSet) {
                        data_arr.push(item)
                    }
                    db.query(`UPDATE collection_gallery SET gallery_tag = '${data_arr.join(",")}' WHERE gallery_id= '${param.galleryId}'`)
                        .then((res) => {}).catch(err => {})
                }).catch(err => {})
            }).catch(err => {
                res.send(new result(null, "修改小姐姐失败！", 500));
            })
    } else {
        //1、上传图片
        //2、修改记录
        if (!fileType.includes(req.file.mimetype)) {
            res.send(new result(null, "只能传小姐姐图片!", 500));
            return
        }
        const fileName = req.file.filename
        const fileSize = req.file.size
        db.query(`INSERT INTO collection_img VALUES ('${fileName}','${fileId}','',${nowTime},${fileSize})`).then(data => {
            db.query(`UPDATE collection_gallery_item SET gallery_item_name = '${param.title}',gallery_item_cover = '${fileId}',
        gallery_item_tag='${param.tags}',create_time=${nowTime},gallery_item_net='${param.netAddress}',
        gallery_item_local='${param.localAddress}',gallery_item_rank=${param.rank} WHERE gallery_item_id='${param.galleryItemId}'`).then(data2 => {
                res.send(new result("修改成功", "success", 200));
                //同步标签给大类
                db.query(`SELECT GROUP_CONCAT(gallery_item_tag) as gallery_item_tags FROM collection_gallery_item WHERE gallery_id= '${param.galleryId}' AND gallery_item_del_flag = 1`).then((res) => {
                    console.log(res)
                    let tags = res.rows[0].gallery_item_tags ? res.rows[0].gallery_item_tags : ''
                    let dataSet = new Set()
                    let data_arr = []
                    tags.split(",").forEach(item => {
                        dataSet.add(item)
                    })
                    for (let item of dataSet) {
                        data_arr.push(item)
                    }
                    db.query(`UPDATE collection_gallery SET gallery_tag = '${data_arr.join(",")}' WHERE gallery_id= '${param.galleryId}'`)
                        .then((res) => {}).catch(err => {})
                }).catch(err => {})
            }).catch(err => {
                res.send(new result(null, "修改小姐姐失败！", 500));
            })
        }).catch(err => {
            res.send(new result(null, "小姐姐上传失败！", 500));
        })
    }
});

//图集大类删除
router.post('/delete', (req, res, next) => {
    const param = req.body;
    let query1 = db.query(`UPDATE collection_gallery SET gallery_del_flag=0 WHERE gallery_id = '${param.gallery_id}'`)
    let query2 = db.query(`UPDATE collection_gallery_item SET gallery_item_del_flag=0 WHERE gallery_id = '${param.gallery_id}'`)
    Promise.all([query1, query2]).then((data) => {
        res.send(new result("小姐姐走了...", "success", 200))
    }).catch((err) => {
        res.send(new result(null, "小姐姐删除失败！", 500));
    })
})

//图集小类删除
router.post('/delete/item', (req, res, next) => {
    const param = req.body;
    let query2 = db.query(`UPDATE collection_gallery_item SET gallery_item_del_flag=0 WHERE gallery_item_id = '${param.gallery_item_id}'`)
    query2.then((data) => {
        res.send(new result("小姐姐走了...", "success", 200))
        //同步标签给大类
        db.query(`SELECT GROUP_CONCAT(gallery_item_tag) as gallery_item_tags FROM collection_gallery_item WHERE gallery_id= '${param.gallery_id}' AND gallery_item_del_flag = 1`).then((res) => {
            let tags = res.rows[0].gallery_item_tags ? res.rows[0].gallery_item_tags : ''
            let dataSet = new Set()
            let data_arr = []
            tags.split(",").forEach(item => {
                dataSet.add(item)
            })
            for (let item of dataSet) {
                data_arr.push(item)
            }
            db.query(`UPDATE collection_gallery SET gallery_tag = '${data_arr.join(",")}' WHERE gallery_id= '${param.gallery_id}'`)
                .then((res) => {}).catch(err => {})
        }).catch(err => {})
    }).catch((err) => {
        res.send(new result(null, "小姐姐删除失败！", 500));
    })
})

module.exports = router;
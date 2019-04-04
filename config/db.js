var mysql = require('mysql');
var pool = mysql.createPool({
    host: "",
    user: "root",
    password: "root",
    database: "myCollection",
    port: 3506
});

// function query(sql, callback) {
//     console.log(sql)
//     pool.getConnection(function (err, connection) {
//         connection.query(sql, function (err, rows) {
//             callback(err, rows);
//             connection.release();
//         });
//     });
// }
//修改为promise回调
function query(sql) {
    console.log(sql)
    return new Promise(function (resolve, reject){
        pool.getConnection(function (err, connection) {
            if(err){
                reject(err)
            }else{
                connection.query(sql, function (err, rows, fields) {
                    connection.release();
                    resolve({err,rows,fields})
                });
            }
        })
    })
}

exports.query = query;
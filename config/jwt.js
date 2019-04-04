const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken'); // 使用jwt签名

const secretKey = 'loli-forever'

module.exports = {
    secretKey,
    //用户密码bcrypt加盐
    pw_hash: (pwd) => {
        let salt = bcrypt.genSaltSync(10);
        return bcrypt.hashSync(pwd, salt);
    },
    //登录成功生成token
    generate_token: (param) => {
        return jwt.sign(param, secretKey, {
            expiresIn: 60 * 60 * 24 // 授权时效24小时
        });
    }
}
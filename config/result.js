//返回数据封装model
class Result{
    constructor(data=null,message="",code=500){
        this.data = data;
        this.message = message;
        this.code = code;
    }
}
module.exports = Result;
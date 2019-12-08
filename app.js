var createError = require('http-errors');
var express = require('express');
var bodyParser = require('body-parser')
var path = require('path');
var jwt = require('express-jwt');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

const { secretKey } = require('./config/jwt');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var imgRouter = require('./routes/image');
var girlRouter = require('./routes/girl');
var settingRouter = require('./routes/setting');
var dashboardRouter = require('./routes/dashboard');
var recyleRouter = require('./routes/recyle');
var wgyblogRouter = require('./routes/wgyblog');
var mMediaRouter = require('./routes/m_media')
var mCategory = require('./routes/m_category')
var mTag = require('./routes/m_tag')

var app = express();

// view engine setup
// app.set('views', path.join(__dirname, 'views'));
// app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

//设置跨域访问
app.all('*', function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requeted-With, Content-Type, Accept, Authorization, RBR, cache-control, x-requested-with");
  res.header("Access-Control-Allow-Methods","PUT,POST,GET,DELETE,OPTIONS");
  res.header("Content-Type", "application/json;charset=utf-8");
  res.header('Access-Control-Allow-Credentials', true);
  next();
});

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
app.use(bodyParser.json())

// express-jwt中间件帮我们自动做了token的验证以及错误处理，所以一般情况下我们按照格式书写就没问题，其中unless放的就是你想要不检验token的api。
app.use(jwt({ secret: secretKey}).unless({path: ['/users/login','/users/register',/\/img/i,/\/wgyblog\/img/i]}));

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/img', imgRouter);
app.use('/girl', girlRouter);
app.use('/setting', settingRouter);
app.use('/dashboard', dashboardRouter);
app.use('/recyle', recyleRouter);
app.use('/wgyblog',wgyblogRouter)
app.use('/m_media',mMediaRouter)
app.use('/m_category',mCategory)
app.use('/m_tag',mTag)

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  // render the error page
  // res.status(err.status || 500);
  res.send({
    message:err.message,
    code:err.status || 500
  });
});

module.exports = app;

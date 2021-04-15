const jwt = require('jsonwebtoken');

module.exports = (req,res,next)=>{
    const authHeader = req.get('Authorization');
    if(!authHeader){
        req.isAuth = false;
        return next();
    }
    const token = authHeader.split(' ')[1];
    let decode;
    try{
        decode = jwt.verify(token,'somthingsupersecret');
    }catch(err){
        req.isAuth = false;
        return next();
    }
    if(!decode){
        req.isAuth = false;
        return next();
    }
    req.userId = decode.userId;
    req.isAuth = true;
    next();
}
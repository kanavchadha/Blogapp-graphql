const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user');

exports.signup = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ message: 'validation Failed! ' + errors.array() });
    }

    const password = req.body.password;
    bcrypt.hash(password, 10).then(hashPassword=>{
        const user = new User({
            email: req.body.email,
            name: req.body.name,
            password: hashPassword
        })
        return user.save();
    }).then(result=>{
        return res.status(201).json({message: 'User created Successfully!',userId: result._id});
    }).catch(err => {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    })
   
}

exports.login = (req, res, next) => {
    const email = req.body.email;
    const password = req.body.password;
    let loadedUser;

    User.findOne({email: email}).then(user=>{
        if(!user){
            const error = new Error('user with this Email not found!');
            error.statusCode = 404;
            throw error;
        }
        loadedUser = user;
        return bcrypt.compare(password,user.password);
    }).then(result=>{
        if(!result){
            const error = new Error('wrong password or email!');
            error.statusCode = 401;
            throw error;
        }
        const token = jwt.sign({email: loadedUser.email, userId: loadedUser._id.toString()},'somthingsupersecret',{expiresIn: '2 days'});
        res.status(200).json({token: token,userId: loadedUser._id.toString() });

    }).catch(err => {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    })
}

exports.getUserStatus = (req,res,next)=>{
    User.findById(req.userId).then(user=>{
        if(!user){
            const error = new Error('user not found!');
            error.statusCode = 404;
            throw error;
        }
        return res.status(200).json({status: user.status});
    }).catch(err=>{
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    })
}

exports.postUserStatus = (req,res,next)=>{
    console.log(req.body.status);
    const status = req.body.status;
    User.findById(req.userId).then(user=>{
        if(!user){
            const error = new Error('user not found!');
            error.statusCode = 404;
            throw error;
        }
        user.status = status;
        return user.save();
    }).then(result=>{
        return res.status(201).json({message: 'Status is updated Successfully!', status: status});
    }).catch(err=>{
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    })
}
const Post = require('../models/post');
const User = require('../models/user');
const { validationResult } = require("express-validator");
const fs = require('fs');
const path = require('path');

exports.getPosts = (req, res, next) => {
  const currPage = req.query.page || 1;
  const postPerPage = 3;
  let TotalItems;
  Post.find().countDocuments().then(cntDoc=>{
    TotalItems = cntDoc;
    return Post.find().populate('creator').sort({createdAt: -1}).skip((currPage-1)*postPerPage).limit(postPerPage);
  }).then(posts => {
    return res.status(200).json({ message: 'Success', posts: posts, totalItems: TotalItems });
  }).catch(err => {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  })
};

exports.createPost = (req, res, next) => {

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ message: 'validation Failed! ' + errors.array() });
  }
  if (!req.file) {
    const error = new Error('No image provided!');
    error.statusCode = 422;
    throw error;
  }
  const imageUrl = req.file.path.replace('\\','/');
  const post = new Post({
    title: req.body.title,
    imageUrl: imageUrl,
    content: req.body.content,
    creator: req.userId // from decoded jwt token in middleware/auth file.
  });
  let creator;
  post.save().then(result=>{
    return User.findById(req.userId);
  }).then(user => {
    creator = user;
    user.posts.push(post);
    return user.save();
  }).then(result =>{
    res.status(201).json({
      message: 'Post created successfully!',
      post: post,
      creator: {_id: creator._id, name: creator.name}
    })
  }).catch(err => {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  });

};

exports.getPostsById = (req, res, next) => {
  const postId = req.params.id;
  Post.findById(postId).populate('creator').then(post => {
    if (!post) {
      const error = new Error('Post Not Found!');
      error.statusCode = 404;
      throw (error);
    }
    res.status(200).send({ message: 'Post Found Successfully', post: post });
  }).catch(err => {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  })
}

exports.updatePost = (req, res, next) => {
  const postId = req.params.id;

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ message: 'validation Failed! ' + errors.array() });
  }

  let imageUrl = req.body.image;
  if (req.file) {
    imageUrl = req.file.path.replace('\\','/');
  }
  if (!imageUrl) {
    const error = new Error('No image provided!');
    error.statusCode = 422;
    throw error;
  }

  Post.findById(postId).populate('creator').then(p => {
    if (!p) {
      const error = new Error('Post Not Found!');
      error.statusCode = 404;
      throw (error);
    }
    if(p.creator._id.toString() !== req.userId){
      const error = new Error('Access Denied!');
      error.statusCode = 403;
      throw error;
    }
      if(imageUrl !== p.imageUrl){
        imageCleanUp(p.imageUrl);
      }
      p.title = req.body.title;
      p.imageUrl = imageUrl;
      p.content = req.body.content;
      return p.save();
  }).then(result => {
    return res.status(200).json({
      message: 'Post updated successfully!',
      post: result
    })
  }).catch(err => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
}

exports.deletePost = (req,res,next)=>{

  const postId = req.params.id;

  Post.findById(postId).then(p=>{
    if(!p){
      const error = new Error('Post Not Found!');
      error.statusCode = 404;
      throw (error);
    }
    if(p.creator.toString() !== req.userId){
      const error = new Error('Access Denied!');
      error.statusCode = 403;
      throw error;
    }

    imageCleanUp(p.imageUrl);
    return Post.findByIdAndRemove(postId);
  }).then(result=>{
    return User.findById(req.userId);
  }).then(user=>{
    user.posts.pull(postId);
    return user.save();
  }).then(result=>{
    return res.status(200).json({ message: 'Post deleted successfully!' });
  }).catch(err => {
    console.log(err);
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
  })
}

const imageCleanUp = (filepath)=>{
  filepath = path.join(__dirname,'..',filepath);
  fs.unlink(filepath,err=> console.log(err));
}

// db.users.find(name: new RegExp(search)) //For substring search, case sensitive. 
// db.users.find(name: new RegExp('^' + search + '$')) //For exact search, case sensitive
// db.users.find(name: new RegExp(search， ‘i')) //For substring search, case insensitive
// db.users.find(name: new RegExp('^' +search + '$', 'i')); //For exact search, case insensitive
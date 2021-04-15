const User = require('../models/user');
const Post = require('../models/post');
const bcrypt = require('bcryptjs');
const validator = require('validator');
const jwt = require('jsonwebtoken');
const path = require("path");
const fs = require("fs");

module.exports = {
    createUser: async function ({ userInput }, req) {
        const { email, name, password } = userInput;
        const errors = [];
        if (!validator.isEmail(email)) {
            errors.push({ message: 'email is invalid' });
        }
        if (validator.isEmpty(password) || !validator.isLength(password, { min: 5 })) {
            errors.push({ message: 'password is too short!' });
        }

        if (errors.length > 0) {
            const err = new Error('Invalid Input!');
            err.data = errors;
            err.code = 422;
            throw err;
        }
        const user = await User.findOne({ email: email });
        if (user) {
            const err = new Error('User already exist!');
            err.code = 400;
            throw err;
        }
        const hashPassword = await bcrypt.hash(password, 10);
        const newUser = new User({
            email: email,
            name: name,
            password: hashPassword
        })
        const createdUser = await newUser.save();
        return { ...createdUser._doc, _id: createdUser._id.toString() };
    },

    login: async function ({ email, password }, req) {
        let loadedUser;
        const user = await User.findOne({ email: email });
        if (!user) {
            const err = new Error('User Not exist!');
            err.code = 401;
            throw err;
        }
        const isEqual = await bcrypt.compare(password, user.password);
        if (!isEqual) {
            const err = new Error('wrong email or password!');
            err.code = 401;
            throw err;
        }
        const token = jwt.sign({
            userId: user._id.toString(),
            email: user.email
        }, 'somthingsupersecret', { expiresIn: '48h' });

        return { token: token, userId: user._id.toString() };
    },
    createPost: async function ({ postInput }, req) {
        if (!req.isAuth) {
            const error = new Error('Not Authenticated!');
            error.code = 401;
            throw error;
        }
        const errors = [];
        if (validator.isEmpty(postInput.title) || !validator.isLength(postInput.title, { min: 5 })) {
            errors.push({ message: 'Title is invalid' });
        }
        if (validator.isEmpty(postInput.content) || !validator.isLength(postInput.content, { min: 10 })) {
            errors.push({ message: 'content is invalid' });
        }
        if (errors.length > 0) {
            const err = new Error('Invalid Input!');
            err.data = errors;
            err.code = 422;
            throw err;
        }

        const user = await User.findById(req.userId);
        if (!user) {
            const error = new Error('Not Authenticated!');
            error.code = 401;
            throw error;
        }
        const post = new Post({
            title: postInput.title,
            content: postInput.content,
            imageUrl: postInput.imageUrl,
            creator: user
        });
        const newPost = await post.save();
        user.posts.push(newPost);
        await user.save();
        return { ...newPost._doc, _id: newPost._id.toString(),claps: {totalClaps: newPost.claps.length, clap: newPost.claps}, createdAt: newPost.createdAt.toISOString(), updatedAt: newPost.updatedAt.toISOString() };
    },

    posts: async function ({ page }, req) {
        if (!req.isAuth) {
            const error = new Error('Not Authenticated!');
            error.code = 401;
            throw error;
        }
        if (!page) {
            page = 1;
        }
        const perPage = 3;
        const totalPosts = await Post.find().countDocuments();
        const posts = await Post.find()
            .skip(perPage * (page - 1))
            .limit(perPage)
            .sort({ createdAt: -1 })
            .populate('creator');
        return {
            totalPosts: totalPosts,
            posts: posts.map(p => {
                return { ...p._doc, _id: p._id.toString(),claps: {totalClaps: p.claps.length, clap: p.claps}, createdAt: p.createdAt.toISOString(), updatedAt: p.updatedAt.toISOString() };
            })
        }
    },
    post: async function ({ postId }, req) {
        if (!req.isAuth) {
            const error = new Error('Not Authenticated!');
            error.code = 401;
            throw error;
        }
        const post = await Post.findById(postId).populate('creator');
        if (!post) {
            const error = new Error('Post Not Found!');
            error.code = 404;
            throw error;
        }
        return { ...post._doc, _id: post._id.toString(),claps: {totalClaps: post.claps.length, clap: post.claps}, createdAt: post.createdAt.toISOString(), updatedAt: post.updatedAt.toISOString() }
    },

    updatePost: async function ({ id, postInput }, req) {
        if (!req.isAuth) {
            const error = new Error('Not Authenticated!');
            error.code = 401;
            throw error;
        }
        const post = await Post.findById(id).populate('creator');
        if (!post) {
            const error = new Error('Post Not Found!');
            error.code = 404;
            throw error;
        }
        if (post.creator._id.toString() !== req.userId.toString()) {
            const error = new Error('Access Denied!');
            error.code = 403;
            throw error;
        }
        const errors = [];
        if (validator.isEmpty(postInput.title) || !validator.isLength(postInput.title, { min: 5 })) {
            errors.push({ message: 'Title is invalid' });
        }
        if (validator.isEmpty(postInput.content) || !validator.isLength(postInput.content, { min: 10 })) {
            errors.push({ message: 'content is invalid' });
        }
        if (errors.length > 0) {
            const err = new Error('Invalid Input!');
            err.data = errors;
            err.code = 422;
            throw err;
        }
        post.title = postInput.title;
        post.content = postInput.content;
        if (postInput.imageUrl !== 'undefined') {
            post.imageUrl = postInput.imageUrl;
        }
        const updatedPost = await post.save();
        return { ...updatedPost._doc, _id: updatedPost._id.toString(),claps: {totalClaps: updatedPost.claps.length, clap: updatedPost.claps}, createdAt: updatedPost.createdAt.toISOString(), updatedAt: updatedPost.updatedAt.toISOString() }
    },
    deletePost: async function ({ postId }, req) {
        if (!req.isAuth) {
            const error = new Error('Not Authenticated!');
            error.code = 401;
            throw error;
        }
        const post = await Post.findById(postId);
        if (!post) {
            const error = new Error('Post Not Found!');
            error.code = 404;
            throw error;
        }
        if (post.creator.toString() !== req.userId.toString()) {
            const error = new Error('Access Denied!');
            error.code = 403;
            throw error;
        }
        imageCleanUp(post.imageUrl);
        await Post.findByIdAndRemove(post._id);
        const user = await User.findById(req.userId);
        user.posts.pull(post._id);
        await user.save();
        return true;
    },
    setStatus: async function({status},req){
        if (!req.isAuth) {
            const error = new Error('Not Authenticated!');
            error.code = 401;
            throw error;
        }
        const user = await User.findById(req.userId);
        user.status = status;
        await user.save();
        return true;
    },
    currUser: async function({},req){
        if (!req.isAuth) {
            const error = new Error('Not Authenticated!');
            error.code = 401;
            throw error;
        }
        const user = await User.findById(req.userId);
        return {...user._doc, _id: user._id.toString() }
    },
    clap: async function({postId},req){
        if (!req.isAuth) {
            const error = new Error('Not Authenticated!');
            error.code = 401;
            throw error;
        }
        const post = await Post.findById(postId);
        const fu = post.claps.some(c => c.toString() === req.userId.toString());
        if(fu){
            post.claps.pull(req.userId);
        } else{
            post.claps.push(req.userId);
        }
        const updatedPost = await post.save();
        return {totalClaps: updatedPost.claps.length, clap: updatedPost.claps};
    }
}

const imageCleanUp = (filepath) => {
    filepath = path.join(__dirname, '..', filepath);
    fs.unlink(filepath, err => console.log(err));
}
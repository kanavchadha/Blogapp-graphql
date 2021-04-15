const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const app = express();
const graphqlHttp = require('express-graphql').graphqlHTTP;

const graphqlSchema = require('./graphql/schema');
const graphqlResolver = require('./graphql/resolvers');
const auth = require('./middleware/auth');

const MONGODB_URI = process.env.MONGODB_URL;

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET, POST, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') { // for GraphQL. Basically GraphQL automatically decline OPTIONS(basically which are not GET POST) request. so here we are returning an empty response which means this OPTIONS request can never get reaches to graphql middleware. [BTW OPTIONS requests are send by browser before sending any other request like GET or POST].
        return res.sendStatus(200);
    }
    next();
});

const fileStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'images/');
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname)
    }
})
const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'image/png' || file.mimetype === 'image/jpg' || file.mimetype === 'image/jpeg') {
        cb(null, true);
    } else {
        cb(null, false);
    }
}

// app.use(bodyParser.urlencoded()); // x-www-form-urlencoded <form>
app.use(bodyParser.json()); // application/json
app.use(multer({ storage: fileStorage, fileFilter: fileFilter }).single('image')); // as our input field named as image
app.use('/images', express.static(path.join(__dirname, 'images')));

app.use(auth);
app.put('/post-image', (req, res, next) => {
    if(!req.isAuth){
        throw new Error('Not Authenticated!');
    }
    if (!req.file) {
        return res.status(200).json({ message: 'No File Provided!' });
    }
    if(req.body.oldPath){
        imageCleanUp(req.body.oldPath);
    }
    return res.status(201).json({message: 'file stored', imagePath: req.file.path.replace('\\','/')});
})

app.use('/graphql', graphqlHttp({
    schema: graphqlSchema,
    graphiql: true,
    rootValue: graphqlResolver,
    customFormatErrorFn(err) {
        if (!err.originalError) {
            return err;
        }
        console.log(err);
        const data = err.originalError.data;
        const message = err.message || 'Error Occured!';
        const status = err.originalError.code || 500;
        return { data, message, status };
    }
}));

app.use((error, req, res, next) => {
    console.log(error);
    res.status(error.statusCode).send({ error: error.message })
})

mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true }).then(res => {
    console.log('Connected to DB');
    app.listen(8080, () => { console.log("Blog-Server has Started!") });
}).catch(err => {
    console.log(err);
})

const imageCleanUp = (filepath) => {
    filepath = path.join(__dirname, '..', filepath);
    fs.unlink(filepath, err => console.log(err));
}
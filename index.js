import express from "express"
import cors from 'cors'
import dotenv from 'dotenv'
import upload from 'express-fileupload'
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import cookieParser from "cookie-parser";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import userRoutes from './routes/user.route.js'
import postRoutes from './routes/post.route.js'
import contactRoutes from './routes/contact.route.js'

import connectMongoDB from './db/connectMongoDB.js'


dotenv.config()

const app = express()

const PORT = process.env.PORT || 5000

const corsOptions = {
    AccessControlAllowOrigin: "*",
    origin: ["http:95.141.241.35", "http://localhost:3000", "https://thecryptotrades.com", "http://thecryptotrades.com.thecryptotrades.digital.com", "https://thecryptotrades.digital.com"],
    methods: 'GET,POST,PUT,DELETE,OPTIONS,HEAD,PATCH',
    credentials: true,
}

app.use(cors(corsOptions));
app.use(express.json()); //to parse req.body
app.use(express.urlencoded({extended: true})) //to parse form data
//app.use(cors({credentials: true, /*origin: "http://localhost:3000"*/}))
app.use(upload())
app.use('/uploads', express.static(__dirname + '/uploads'))
app.use(cookieParser())

app.use('/api/authors', userRoutes)
app.use('/api/posts', postRoutes)
app.use('/api/contact', contactRoutes)

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    connectMongoDB()
})
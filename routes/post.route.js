import express from "express";
import { createPost, deletePost, editPost, getAuthorPosts, getCatPosts, getPost, getPosts } from "../controllers/post.controller.js";
import { protectRoute } from "../middleware/protectRoute.js";

const router = express.Router()

router.post('/create', protectRoute, createPost)
router.get('/', getPosts)
router.get('/:id', getPost)
router.get('/categories/:category', getCatPosts)
router.get('/authors/:id', getAuthorPosts)
router.patch('/:id', protectRoute, editPost)
router.delete('/:id', protectRoute, deletePost)

export default router
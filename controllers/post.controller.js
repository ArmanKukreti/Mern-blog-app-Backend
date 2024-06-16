import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { dirname } from "path";
import { v4 as uuid } from "uuid";
import dotenv from "dotenv";
import { v2 as cloudinary } from "cloudinary";
import { Readable } from 'stream';
dotenv.config();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import User from "../models/user.model.js";
import Post from "../models/post.model.js";


export const createPost = async (req, res) => {
    try {
        const { title, category, description } = req.body;

        if (!title || !category || !description || !req.files) {
            return res
                .status(422)
                .json({ error: "Fill all the fields and choose thumbnail" });
        }

        const { thumbnail } = req.files;

        if (thumbnail.size > 2000000) {
            return res
                .status(422)
                .json({ error: "Thumbnail should be less than 2mb" });
        }

        const stream = cloudinary.uploader.upload_stream(
            { resource_type: "image" },
            async (error, result) => {
                if (error) {
                    console.error(error);
                    return res.status(500).json({ error: "An error occurred during file upload" });
                }

                try {
                    const newPost = await Post.create({
                        creator: req.user._id,
                        title,
                        category,
                        description,
                        thumbnail: {
                            public_id: result.public_id,
                            url: result.secure_url
                        }
                    });

                    if (!newPost) {
                        return res.status(422).json({ error: "Post couldn't be created" });
                    }

                    // Find user and increment post count by 1
                    const currentUser = await User.findById(req.user._id);
                    const userPostCount = currentUser.posts + 1;

                    await User.findByIdAndUpdate(req.user._id, {
                        posts: userPostCount,
                    });

                    res.status(201).json(newPost);
                } catch (dbError) {
                    console.error(dbError);
                    res.status(500).json({ error: "An error occurred while creating the post" });
                }
            }
        );

        const readableStream = new Readable();
        readableStream.push(thumbnail.data);
        readableStream.push(null);
        readableStream.pipe(stream);

    } catch (error) {
        console.log("Error in createPost controller", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const getPosts = async (req, res) => {
    try {
        const posts = await Post.find().sort({ updatedAt: -1 });
        res.status(200).json(posts);
    } catch (error) {
        console.log("Error in getPosts controller", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const getPost = async (req, res) => {
    try {
        const postId = req.params.id;

        const post = await Post.findById(postId);
        if (!post) {
            return res.status(422).json({ error: "Post not found" });
        }

        res.status(200).json(post);
    } catch (error) {
        console.log("Error in getPost controller", error.message);
        res.status(500).json({ error: error.message });
    }
};

export const getCatPosts = async (req, res) => {
    try {
        const { category } = req.params;

        const catPosts = await Post.find({ category }).sort({ createdAt: -1 });

        res.status(200).json(catPosts);
    } catch (error) {
        console.log("Error in getCatPosts controller", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const getAuthorPosts = async (req, res) => {
    try {
        const { id } = req.params;

        const posts = await Post.find({ creator: id }).sort({ createdAt: -1 });

        res.status(200).json(posts);
    } catch (error) {
        console.log("Error in getAuthorPosts controller", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const editPost = async (req, res) => {
    try {
        let updatedPost;

        const postId = req.params.id;
        const { title, category, description } = req.body;

        if (!title || !category || !description || description.length < 12) {
            return res.status(422).json({ error: "Fill all the fields" });
        }

        const oldPost = await Post.findById(postId);

        if (!oldPost) {
            return res.status(404).json({ error: "Post not found" });
        }

        if (req.user._id.toString() !== oldPost.creator.toString()) {
            return res.status(403).json({ error: "Cannot edit post" });
        }

        if (!req.files || !req.files.thumbnail) {
            // No new thumbnail provided, update post without changing the thumbnail
            updatedPost = await Post.findByIdAndUpdate(
                postId,
                { title, category, description },
                { new: true }
            );
            if (!updatedPost) {
                return res.status(400).json({ error: "Can't update post" });
            }
            return res.status(200).json(updatedPost);
        }

        // New thumbnail provided, process the file
        const { thumbnail } = req.files;

        if (thumbnail.size > 2000000) {
            return res.status(422).json({ error: "Thumbnail should be less than 2mb" });
        }

        // Delete old thumbnail from Cloudinary
        const oldThumbnail = oldPost.thumbnail.public_id;

        await cloudinary.uploader.destroy(oldThumbnail, { invalidate: true });

        // Upload new thumbnail to Cloudinary directly from buffer
        const stream = cloudinary.uploader.upload_stream(
            { resource_type: "image" },
            async (error, result) => {
                if (error) {
                    console.error(error);
                    return res.status(500).json({ error: "An error occurred during file upload" });
                }

                updatedPost = await Post.findByIdAndUpdate(
                    postId,
                    {
                        title,
                        category,
                        description,
                        thumbnail: {
                            public_id: result.public_id,
                            url: result.secure_url
                        }
                    },
                    { new: true }
                );

                if (!updatedPost) {
                    return res.status(400).json({ error: "Can't update post" });
                }

                res.status(200).json(updatedPost);
            }
        );

        // Convert the thumbnail buffer to a readable stream and pipe it to the upload stream
        const readableStream = new Readable();
        readableStream.push(thumbnail.data);
        readableStream.push(null);
        readableStream.pipe(stream);

    } catch (error) {
        console.log("Error in editPost controller", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const deletePost = async (req, res) => {
    try {
        const postId = req.params.id;

        if (!postId) {
            return res.status(400).json({ error: "Post unavailable" });
        }

        const post = await Post.findById(postId);

        if (!post) {
            return res.status(404).json({ error: "Post not found" });
        }

        if (req.user._id.toString() !== post.creator.toString()) {
            return res.status(403).json({ error: "Cannot delete post" });
        }

        // Delete thumbnail from Cloudinary
        const thumbnailPublicId = post.thumbnail.public_id;

        try {
            await cloudinary.uploader.destroy(thumbnailPublicId, { invalidate: true });
        } catch (cloudinaryError) {
            console.error("Error deleting image from Cloudinary", cloudinaryError.message);
            return res.status(500).json({ error: "Error deleting image from Cloudinary" });
        }

        // Delete the post
        try {
            await Post.findByIdAndDelete(postId);

            const currentUser = await User.findById(req.user._id);
            const userPostCount = currentUser.posts - 1;

            await User.findByIdAndUpdate(req.user._id, {
                posts: userPostCount,
            });

            res.status(200).json({ message: `Post ${postId} deleted successfully` });
        } catch (dbError) {
            console.error("Error deleting post from database", dbError.message);
            res.status(500).json({ error: "Error deleting post from database" });
        }
    } catch (error) {
        console.log("Error in deletePost controller", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};


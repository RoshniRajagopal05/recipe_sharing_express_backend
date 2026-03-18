var express = require('express');
var router = express.Router();
const bcrypt = require('bcrypt');
const User = require('../models/usermodel');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET
const fs = require('fs');



//middleware to verify token

const verifyToken = (req, res, next) => {
    const token = req.headers['authorization'];

    if (!token) {
        return res.status(401).json({ message: 'No token provided' });
    }
    const  actualToken = token.split(' ')[1]; // Extract token from "
    try {                                                              // payload → data inside token
        const decoded = jwt.verify(actualToken, JWT_SECRET);          // decoded.userId → user identity      decoded → extracted payload
        req.userId = decoded.userId; // attach user id to request      //tokenilu ninnu vanna userId edthu req.userIdyilu edthu vachu.
        next();                                                        // req.userId → make it usable in APIs
    } catch (error) {
        return res.status(401).json({ message:error});
    }
};

//middle ware for image upload
const multer = require('multer');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

// route for signup

router.post('/signupapi', async (req, res) => {
    try {
        const { username, email, password, confirmPassword } = req.body;

        // Check if passwords match
        if (password !== confirmPassword) {
            return res.status(400).json({ message: 'Password and Confirm Password do not match' });
        }

        // Validate fields using mongoose
        const user = new User({ username, email, password });
        const validationError = user.validateSync();

        if (validationError) {
            return res.status(400).json({ error: validationError.errors });
        }

        // Check if email already exists
        const existingUser = await User.findOne({ email });

        if (existingUser) {
            return res.status(400).json({ message: 'Email already taken' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Save new user
        const newUser = new User({
            username,
            email,
            password: hashedPassword
        });

        const savedUser = await newUser.save();

        // Send response
        res.status(201).json({ message: 'Account created successfully' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

module.exports = router;




// Login API
router.post('/loginapi', async (req, res) => {
    try {
        const { email, password } = req.body;

        // 1. Check user exists
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // 2. Compare password
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // 3. Generate JWT token
        const token = jwt.sign(
            { userId: user._id },   // payload (data inside token)
            JWT_SECRET,             // secret key
            { expiresIn: '1h' }     // token expiry
        );

        // 4. Send token
        res.status(200).json({ token,userId: user._id, username: user.username });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});






// Create Recipe API
const Recipe = require('../models/recipemodel');
router.post('/createrecipe', verifyToken, upload.single('image'), async (req, res) => {
    try {
        const { title, description, ingredients, steps, cookingtime, difficulty } = req.body;

        // Validate required fields
        if (!title || !description || !ingredients || !steps || !cookingtime || !difficulty) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        // Create recipe
        const newRecipe = new Recipe({
            title,
            description,
            ingredients,
            steps,
            cookingtime,
            difficulty,
            image: req.file ? req.file.filename : null,
            userId: req.userId
        });

        const savedRecipe = await newRecipe.save();

        res.status(201).json({
            message: 'Recipe created successfully',
            recipe: savedRecipe
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});



// Listing All Recipes API
router.get('/listingrecipes', async (req, res) => {
    try {
        const recipes = await Recipe.find().populate('userId', 'username');

        res.status(200).json({
            count: recipes.length,
            recipes: recipes
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});




// Profile API (Get logged-in user's data + recipes)

router.get('/profile', verifyToken, async (req, res) => {
    try {
        // 1. Get logged-in user
        const user = await User.findById(req.userId).select('username email');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // 2. Get recipes created by this user
        const recipes = await Recipe.find({ userId: req.userId });

        // 3. Send combined response
        res.status(200).json({
            user: user,
            recipes: recipes
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});


// Edit Recipe API
router.put('/editrecipe/:id', verifyToken, async (req, res) => {
    try {
        const recipeId = req.params.id;

        const recipe = await Recipe.findById(recipeId);

        if (!recipe) {
            return res.status(404).json({ message: 'Recipe not found' });
        }

        // 🚫 Ownership check FIRST
        if (recipe.userId.toString() !== req.userId) {
            return res.status(403).json({ message: 'You are not allowed to edit this recipe' });
        }

        // 📸 Now run multer
        upload.single('image')(req, res, async (err) => {
            if (err) {
                return res.status(500).json({ message: 'File upload error' });
            }

            try {
                const { title, description, ingredients, steps, cookingtime, difficulty } = req.body;

                recipe.title = title || recipe.title;
                recipe.description = description || recipe.description;
                recipe.ingredients = ingredients || recipe.ingredients;
                recipe.steps = steps || recipe.steps;
                recipe.cookingtime = cookingtime || recipe.cookingtime;
                recipe.difficulty = difficulty || recipe.difficulty;

                if (req.file) {
                    recipe.image = req.file.filename;
                }

                const updatedRecipe = await recipe.save();

                res.status(200).json({
                    message: 'Recipe updated successfully',
                    recipe: updatedRecipe
                });

            } catch (error) {

                // 🧹 DELETE uploaded file if error happens
                if (req.file) {
                    fs.unlink(req.file.path, () => {});
                }

                console.error(error);
                res.status(500).json({ message: 'Internal Server Error' });
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});



// Delete Recipe API
router.delete('/deleterecipe/:id', verifyToken, async (req, res) => {
    try {
        const recipeId = req.params.id;

        // 1. Find recipe
        const recipe = await Recipe.findById(recipeId);

        if (!recipe) {
            return res.status(404).json({ message: 'Recipe not found' });
        }

        // 2. Ownership check 🔐
        if (recipe.userId.toString() !== req.userId) {
            return res.status(403).json({ message: 'You are not allowed to delete this recipe' });
        }

        // 3. Delete image file if exists 📸
        if (recipe.image) {
            const imagePath = `uploads/${recipe.image}`;

            fs.unlink(imagePath, (err) => {
                if (err) {
                    console.log("Image deletion error:", err);
                }
            });
        }

        // 4. Delete recipe from DB 💣
        await Recipe.findByIdAndDelete(recipeId);

        // 5. Send response
        res.status(200).json({ message: 'Recipe deleted successfully' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});



router.put('/changepassword', verifyToken, async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;
        console.log("Received data:", { currentPassword, newPassword, confirmPassword });

        // 1. Validate input
        if (!currentPassword || !newPassword || !confirmPassword) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({ message: 'New password and confirm password do not match' });
        }

        // 2. Get logged-in user
        const user = await User.findById(req.userId);
        console.log("User ID from token:", req.userId);
        console.log("User found:", user);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
console.log("currentPassword:", currentPassword);
 

        // 3. Check current password
        const isMatch = await bcrypt.compare(currentPassword, user.password);

        if (!isMatch) {
            return res.status(401).json({ message: 'Current password is incorrect' });
        }

        // 4. Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // 5. Update password
        user.password = hashedPassword;

        await user.save();

        // 6. Response
        res.status(200).json({ message: 'Password updated successfully' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});



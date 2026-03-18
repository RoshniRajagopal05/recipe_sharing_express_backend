var express = require('express');
var router = express.Router();
const bcrypt = require('bcrypt');
const User = require('../models/usermodel');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET








//middleware to verify token

const verifyToken = (req, res, next) => {
    const token = req.headers['authorization'];

    if (!token) {
        return res.status(401).json({ message: 'No token provided' });
    }
    const  actualToken = token.split(' ')[1]; // Extract token from "
    try {
        const decoded = jwt.verify(actualToken, JWT_SECRET);
        req.userId = decoded.userId; // attach user id to request
        next();
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
        res.status(200).json({ token });

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








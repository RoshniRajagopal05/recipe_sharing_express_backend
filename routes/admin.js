var express = require('express');
var router = express.Router();

const Admin = require('../models/adminModel');
const User = require('../models/usermodel');
const Recipe = require('../models/recipemodel');


// 🔹 CREATE ADMIN
router.get('/createAdmin', (req, res) => {

  const newAdmin = new Admin({
    username: 'admin1',
    email: 'admin@gmail.com',
    password: '12345678'
  });

  newAdmin.save()
    .then(() => res.send('Admin created successfully'))
    .catch((error) => {
      console.error(error);
      res.send('Error creating admin');
    });

});


// 🔹 SHOW LOGIN PAGE
router.get('/login', (req, res) => {
  res.render('admin/login', { showNavbar: false });
});


// 🔹 HANDLE LOGIN
router.post('/login', async (req, res) => {

  try {
    const { email, password } = req.body;

    const admin = await Admin.findOne({ email });

    if (!admin) return res.send('Admin not found');

    const isMatch = password === admin.password;

    if (!isMatch) return res.send('Incorrect password');

    // ✅ SESSION SET
    req.session.isAdmin = true;

    res.redirect('/admin/dashboard');

  } catch (error) {
    console.error(error);
    res.send('Error during login');
  }
});


// 🔹 DASHBOARD (PROTECTED)
router.get('/dashboard', (req, res) => {

  if (!req.session.isAdmin) {
    return res.redirect('/admin/login');
  }

  res.render('admin/dashboard', { showNavbar: true });
});


// 🔹 LOGOUT
router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/admin/login');
  });
});





// 🔹 USER LISTING PAGE
router.get('/users', async (req, res) => {

  // 🔐 Protect route
  if (!req.session.isAdmin) {
    return res.redirect('/admin/login');
  }

  try {
    const users = await User.find(); // ✅ fetch real users

    res.render('admin/users', { 
      showNavbar: true,
      users: users 
    });

  } catch (error) {
    console.error(error);
    res.send('Error fetching users');
  }

});

// 🔹 BLOCK USER
router.get('/block-user/:id', async (req, res) => {

  await User.findByIdAndUpdate(req.params.id, {
    isActive: false
  });

  res.redirect('/admin/users');
});

// 🔹 UNBLOCK USER
router.get('/unblock-user/:id', async (req, res) => {

  await User.findByIdAndUpdate(req.params.id, {
    isActive: true
  });

  res.redirect('/admin/users');
});



const mongoose = require('mongoose');

// 🔹 VIEW USER'S RECIPES 
router.get('/recipelisting/:id', async (req, res) => { 
  if (!req.session.isAdmin)
     { return res.redirect('/admin/login'); } 
  const recipes = await Recipe.find({ userId: req.params.id }); 
  console.log(recipes); 
  res.render('admin/recipeView', { showNavbar: true, recipes }); });








// 🔹 VIEW RECIPES OF A USER
router.get('/user-recipes/:id', async (req, res) => {

  if (!req.session.isAdmin) {
    return res.redirect('/admin/login');
  }

  const userId = req.params.id;

  // 🛡️ Validate ObjectId
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).send("Invalid User ID ❌");
  }

  const recipes = await Recipe.find({ userId })
                              .populate('userId');
  console.log(recipes);

  res.render('admin/userRecipes', {
    showNavbar: true,
    recipes
  });
});

module.exports = router;
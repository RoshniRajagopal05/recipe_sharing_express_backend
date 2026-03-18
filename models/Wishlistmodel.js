const mongoose = require('mongoose');
const wishlistSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    recipe: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Recipe"
    }
}, { timestamps: true });

module.exports = mongoose.model("Wishlist", wishlistSchema);
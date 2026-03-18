// const mongoose = require('mongoose');
// const recipeSchema = new mongoose.Schema({
//     title: String,
//     steps: [String],
//     ingredients: [String],
//     cookingTime: Number,
//     difficulty: {
//         type: String,
//         enum: ["easy", "medium", "hard"]
//     },
//     createdBy: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: "User"   // 👈 Reference to User
//     }
// }, { timestamps: true });

// module.exports = mongoose.model("Recipe", recipeSchema);




const mongoose = require('mongoose');

const recipeSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    ingredients: {
        type: String,
        required: true
    },
    steps: {
        type: String,
        required: true
    },
    cookingtime: {
        type: Number,
        required: true
    },
    difficulty: {
        type: String,
        enum: ['Easy', 'Medium', 'Difficult'],
        required: true
    },
    image: {
        type: String
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, { timestamps: true });

module.exports = mongoose.model('Recipe', recipeSchema);
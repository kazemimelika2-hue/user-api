const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
let mongoDBConnectionString = process.env.MONGO_URL;
let Schema = mongoose.Schema;
let userSchema = new Schema({
    userName: {
        type: String,
        unique: true
    },
    password: String,
    favourites: [String]
});

let User;
let db;

module.exports.connect = function () {
    return new Promise(function (resolve, reject) {
        db = mongoose.createConnection(mongoDBConnectionString);
        db.on('error', err => {
            reject(err);
        });
        db.once('open', () => {
            User = db.model("users", userSchema);
            resolve();
        });
    });
};

// Helper to ensure connection
async function ensureConnected() {
    if (!User || !db || db.readyState !== 1) {
        await module.exports.connect();
    }
}

module.exports.registerUser = async function (userData) {
    await ensureConnected();
    
    if (userData.password != userData.password2) {
        throw new Error("Passwords do not match");
    }
    
    try {
        const hash = await bcrypt.hash(userData.password, 10);
        userData.password = hash;
        let newUser = new User(userData);
        await newUser.save();
        return "User " + userData.userName + " successfully registered";
    } catch (err) {
        if (err.code == 11000) {
            throw new Error("User Name already taken");
        } else {
            throw new Error("There was an error creating the user: " + err);
        }
    }
};

module.exports.checkUser = async function (userData) {
    await ensureConnected();
    
    try {
        const user = await User.findOne({ userName: userData.userName }).exec();
        if (!user) {
            throw new Error("Unable to find user " + userData.userName);
        }
        const res = await bcrypt.compare(userData.password, user.password);
        if (res === true) {
            return user;
        } else {
            throw new Error("Incorrect password for user " + userData.userName);
        }
    } catch (err) {
        throw new Error(err.message || "Unable to find user " + userData.userName);
    }
};

module.exports.getUserById = async function (id) {
    await ensureConnected();
    
    try {
        const user = await User.findById(id).exec();
        return user;
    } catch (err) {
        throw new Error("Unable to find user with id: " + id);
    }
};

module.exports.getFavourites = async function (id) {
    await ensureConnected();
    
    try {
        const user = await User.findById(id).exec();
        return user.favourites;
    } catch (err) {
        throw new Error("Unable to get favourites for user with id: " + id);
    }
};

module.exports.addFavourite = async function (id, favId) {
    await ensureConnected();
    
    try {
        const user = await User.findById(id).exec();
        if (user.favourites.length < 50) {
            const updatedUser = await User.findByIdAndUpdate(id,
                { $addToSet: { favourites: favId } },
                { new: true }
            ).exec();
            return updatedUser.favourites;
        } else {
            throw new Error("Unable to update favourites for user with id: " + id);
        }
    } catch (err) {
        throw new Error("Unable to find user with id: " + id);
    }
};

module.exports.removeFavourite = async function (id, favId) {
    await ensureConnected();
    
    try {
        const user = await User.findByIdAndUpdate(id,
            { $pull: { favourites: favId } },
            { new: true }
        ).exec();
        return user.favourites;
    } catch (err) {
        throw new Error("Unable to update favourites for user with id: " + id);
    }
};
